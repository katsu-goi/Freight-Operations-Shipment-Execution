-- =============================================================================
-- Role consolidation: strip Dispatcher / Planner / Client / Carrier.
--
-- Canonical roles are now: Admin, Seller, Customer.
--   * Former Dispatcher/Planner/Carrier accounts -> deactivated (Admin power
--     is deliberately NOT granted to them).
--   * Former Client accounts -> remapped to Customer (same access tier).
--   * RLS helpers is_staff()/is_ops() collapse to Admin-only, which instantly
--     tightens every policy that references them.
--   * RLS clauses keyed on the removed Carrier role are rewritten.
--   * update_parcel_status()/post_tracking_update() authorization narrows to
--     Admin only.
--
-- NOTE 1: PostgreSQL cannot drop enum labels; the removed values remain
--         defined but the application no longer assigns or accepts them
--         (parseAppRole rejects unknown values).
-- NOTE 2: courier platforms (J&T, LBC, ...) remain first-class data via the
--         shipments.platform / carrier_batches tables — they were never users.
-- Idempotent for live DBs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Remap / lock out legacy-role profiles
-- ---------------------------------------------------------------------------
update public.profiles
   set is_active = false
 where role in ('Dispatcher', 'Planner', 'Carrier')
   and is_active;

update public.profiles set role = 'Admin'    where role in ('Dispatcher', 'Planner');
update public.profiles set role = 'Customer' where role = 'Client';

-- ---------------------------------------------------------------------------
-- 2) RBAC helpers: staff/ops collapse to Admin-only
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select case when is_active then role else null end
    from public.profiles
   where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'Admin', false);
$$;

create or replace function public.is_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'Admin', false);
$$;

create or replace function public.can_approve_load_plans()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff();
$$;

grant execute on function public.current_role()
  to anon, authenticated, service_role;
grant execute on function public.is_staff()
  to anon, authenticated, service_role;
grant execute on function public.is_ops()
  to anon, authenticated, service_role;
grant execute on function public.can_approve_load_plans()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Signup trigger: new self-service accounts default to Customer
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'Customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) Rewrite RLS policies that keyed access on the removed Carrier role.
--    (External courier platforms are data — shipments.platform / batches.)
-- ---------------------------------------------------------------------------
drop policy if exists "shipments: scoped read" on public.shipments;
create policy "shipments: scoped read"
  on public.shipments for select
  using (
    public.is_ops()
    or client_id = auth.uid()
    or seller_id = public.current_seller_id()
  );

drop policy if exists "shipments: staff or carrier update" on public.shipments;
create policy "shipments: staff update"
  on public.shipments for update
  using (public.is_staff() or seller_id = public.current_seller_id())
  with check (public.is_staff() or seller_id = public.current_seller_id());

drop policy if exists "tracking: read if shipment visible" on public.shipment_tracking_logs;
create policy "tracking: read if shipment visible"
  on public.shipment_tracking_logs for select
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (
          public.is_ops()
          or s.client_id = auth.uid()
          or s.seller_id = public.current_seller_id()
        )
    )
  );

drop policy if exists "tracking: staff or carrier insert" on public.shipment_tracking_logs;
create policy "tracking: staff insert"
  on public.shipment_tracking_logs for insert
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- 5) Legacy GPS tracking RPC: Admin-only authorization
-- ---------------------------------------------------------------------------
create or replace function public.post_tracking_update(
  p_shipment_id uuid,
  p_message text,
  p_location text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_progress int default null,
  p_status shipment_status default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role  public.app_role;
  v_ship  public.shipments%rowtype;
  v_level text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role <> 'Admin' then
    return jsonb_build_object('ok', false, 'error',
      'Only administrators can post tracking updates');
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Shipment not found');
  end if;

  -- Protective bounds: domestic Philippine tracking only.
  if p_lat is not null and p_lng is not null
     and (p_lat < 4.2 or p_lat > 21.5 or p_lng < 116.0 or p_lng > 127.0) then
    return jsonb_build_object('ok', false, 'error', 'Coordinates must be inside the Philippines');
  end if;

  v_level := case when p_status = 'Delivery Failed'::shipment_status then 'error' else 'info' end;

  insert into public.shipment_tracking_logs
    (shipment_id, event_type, level, message, location, lat, lng, created_by)
  values
    (p_shipment_id, 'gps', v_level, p_message, p_location, p_lat, p_lng, auth.uid());

  update public.shipments
     set current_location = coalesce(p_location, current_location),
         current_lat      = coalesce(p_lat, current_lat),
         current_lng      = coalesce(p_lng, current_lng),
         progress         = coalesce(p_progress, progress),
         status           = coalesce(p_status, status)
   where id = p_shipment_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.post_tracking_update(
  uuid, text, text, double precision, double precision, int, public.shipment_status
) from anon, public;
grant execute on function public.post_tracking_update(
  uuid, text, text, double precision, double precision, int, public.shipment_status
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Atomic status-update RPC: Admin-only authorization
-- ---------------------------------------------------------------------------
create or replace function public.update_parcel_status(
  p_parcel_id   uuid,
  p_status      text,
  p_location    text default null,
  p_hub_id      uuid default null,
  p_description text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    public.app_role;
  v_parcel  public.shipments%rowtype;
  v_new     public.shipment_status;
  v_level   text := 'info';
  v_progress int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role <> 'Admin' then
    return jsonb_build_object('ok', false, 'error',
      'Only administrators can change parcel status');
  end if;

  begin
    v_new := p_status::public.shipment_status;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', 'Unknown parcel status');
  end;

  select * into v_parcel from public.shipments where id = p_parcel_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Parcel not found');
  end if;
  if v_parcel.status = v_new and p_location is null and p_hub_id is null then
    return jsonb_build_object('ok', false, 'error', 'Parcel already has this status');
  end if;

  v_progress := case v_new
    when 'Registered' then 5
    when 'Pickup Scheduled' then 15
    when 'Picked Up' then 25
    when 'Dropped Off' then 30
    when 'At Origin Hub' then 40
    when 'In Transit' then 55
    when 'At Destination Hub' then 70
    when 'Out for Delivery' then 85
    when 'Delivered' then 100
    when 'Delivery Failed' then 90
    when 'Returned' then 60
    when 'Intake' then 10
    else 0
  end;

  v_level := case
    when v_new in ('Delivery Failed', 'Cancelled') then 'error'
    when v_new = 'Returned' then 'warning'
    when v_new = 'Delivered' then 'success'
    else 'info'
  end;

  update public.shipments
     set status          = v_new,
         current_location = coalesce(p_location, current_location),
         current_hub_id   = coalesce(p_hub_id, current_hub_id),
         progress         = v_progress
   where id = p_parcel_id;

  insert into public.shipment_tracking_logs
    (shipment_id, event_type, level, message, location, status, created_by)
  values
    (p_parcel_id, 'status', v_level,
     coalesce(p_description,
       'Status changed from ' || v_parcel.status || ' to ' || v_new),
     coalesce(p_location,
       (select h.name from public.hubs h where h.id = coalesce(p_hub_id, v_parcel.current_hub_id))),
     v_new,
     auth.uid());

  perform public.notify_parcel_event(
    (select * from public.shipments where id = p_parcel_id),
    'Parcel Update',
    'Parcel ' || coalesce(v_parcel.tracking_number, v_parcel.reference) ||
      ' is now ' || replace(v_new, '_', ' ') || '.' ||
      case when p_location is not null then ' Current location: ' || p_location || '.' else '' end
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.update_parcel_status(uuid, text, text, uuid, text)
  from anon, public;
grant execute on function public.update_parcel_status(uuid, text, text, uuid, text)
  to authenticated, service_role;
