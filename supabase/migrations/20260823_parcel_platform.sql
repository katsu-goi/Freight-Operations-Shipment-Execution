-- =============================================================================
-- Parcel Management & Tracking platform upgrade (additive, idempotent).
--
-- Introduces the three-tier role model on top of the existing RBAC:
--   ADMIN    -> existing 'Admin' (+ legacy staff roles keep working)
--   SELLER   -> new 'Seller' app_role; a profile is linked to sellers row
--   CUSTOMER -> new 'Customer' app_role ('Client' remains a supported alias)
--
-- Also adds: parcel lifecycle statuses, hubs/facilities, in-app notifications,
-- PKG-YYYY-NNNNNN tracking numbers, an atomic status-update RPC that writes
-- tracking events + notifications, seller archiving columns, and RLS for all
-- of the above. No existing tables or data are destroyed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Roles
-- ---------------------------------------------------------------------------
alter type public.app_role add value if not exists 'Seller';
alter type public.app_role add value if not exists 'Customer';

-- ---------------------------------------------------------------------------
-- 2) Parcel lifecycle statuses (additive; legacy values stay valid)
-- ---------------------------------------------------------------------------
alter type public.shipment_status add value if not exists 'Registered';
alter type public.shipment_status add value if not exists 'Pickup Scheduled';
alter type public.shipment_status add value if not exists 'Picked Up';
alter type public.shipment_status add value if not exists 'Dropped Off';
alter type public.shipment_status add value if not exists 'At Origin Hub';
alter type public.shipment_status add value if not exists 'At Destination Hub';
alter type public.shipment_status add value if not exists 'Out for Delivery';
alter type public.shipment_status add value if not exists 'Delivery Failed';
alter type public.shipment_status add value if not exists 'Returned';

-- ---------------------------------------------------------------------------
-- 3) HUBS / FACILITIES — event-based location tracking anchors
-- ---------------------------------------------------------------------------
create table if not exists public.hubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique,
  address    text,
  city       text,
  province   text,
  contact    text,
  is_active  boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hubs_name_idx on public.hubs (name);
create index if not exists hubs_active_idx on public.hubs (is_active);

-- ---------------------------------------------------------------------------
-- 4) Column additions
-- ---------------------------------------------------------------------------
-- profiles: link Seller-role users to their sellers record
alter table public.profiles
  add column if not exists seller_id uuid references public.sellers (id) on delete set null;
create index if not exists profiles_seller_idx on public.profiles (seller_id);

-- sellers: archive workflow + richer profile + activity stamp
alter table public.sellers
  add column if not exists business_name text,
  add column if not exists archived_at   timestamptz,
  add column if not exists last_activity_at timestamptz;

-- shipments: parcel attributes + current hub + expected delivery
alter table public.shipments
  add column if not exists description            text,
  add column if not exists dimensions             text,
  add column if not exists shipping_fee           numeric(12,2),
  add column if not exists recipient_phone        text,
  add column if not exists expected_delivery_date date,
  add column if not exists current_hub_id         uuid references public.hubs (id) on delete set null;

create index if not exists shipments_seller_created_idx
  on public.shipments (seller_id, created_at desc);
create index if not exists shipments_hub_idx
  on public.shipments (current_hub_id);
create index if not exists shipments_tracking_number_idx
  on public.shipments (tracking_number);

-- tracking logs: status at the time of the event (tracking timeline source)
alter table public.shipment_tracking_logs
  add column if not exists status public.shipment_status;

-- ---------------------------------------------------------------------------
-- 5) Tracking number sequence: PKG-2026-000001
-- ---------------------------------------------------------------------------
create sequence if not exists public.parcel_tracking_seq start 1;

create or replace function public.next_parcel_tracking_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'PKG-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.parcel_tracking_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- 6) NOTIFICATIONS — in-app, per-user
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  parcel_id       uuid references public.shipments (id) on delete cascade,
  tracking_number text,
  title           text not null,
  message         text not null,
  status          text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, is_read, created_at desc);
create index if not exists notifications_parcel_idx
  on public.notifications (parcel_id);

alter table public.notifications enable row level security;

create policy "notifications: read own"
  on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications: update own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Inserts happen exclusively through SECURITY DEFINER paths (triggers/RPC).

-- ---------------------------------------------------------------------------
-- 7) RBAC helpers for the new roles
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'Admin', false);
$$;

-- Caller is an active Seller linked to a live (non-archived) seller account.
create or replace function public.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.seller_id
    from public.profiles p
   where p.id = auth.uid()
     and p.role = 'Seller'
     and p.is_active
     and p.seller_id is not null
     and exists (select 1 from public.sellers s where s.id = p.seller_id and s.is_active);
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.current_seller_id() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) RLS — extend existing tables to the new roles
-- ---------------------------------------------------------------------------
-- sellers: a Seller reads (and edits contact info of) their own record.
drop policy if exists "sellers: own seller read" on public.sellers;
create policy "sellers: own seller read"
  on public.sellers for select
  using (id = public.current_seller_id());

drop policy if exists "sellers: own seller contact update" on public.sellers;
create policy "sellers: own seller contact update"
  on public.sellers for update
  using (id = public.current_seller_id())
  with check (id = public.current_seller_id());

-- parcels: Seller sees/creates own parcels; Customer keeps client_id scoping.
drop policy if exists "shipments: seller own" on public.shipments;
create policy "shipments: seller own"
  on public.shipments for select
  using (seller_id = public.current_seller_id());

drop policy if exists "shipments: customer own" on public.shipments;
create policy "shipments: customer own"
  on public.shipments for select
  using (
    client_id = auth.uid()
    and coalesce(public.current_role() in ('Customer', 'Client'), false)
  );

drop policy if exists "shipments: seller insert own" on public.shipments;
create policy "shipments: seller insert own"
  on public.shipments for insert
  with check (
    seller_id = public.current_seller_id()
    and client_id is null  -- recipients are linked by staff only
  );

drop policy if exists "shipments: seller edit own registered" on public.shipments;
create policy "shipments: seller edit own registered"
  on public.shipments for update
  using (
    seller_id = public.current_seller_id()
    and status::text = 'Registered'  -- text compare: new enum value, safe in-txn
  )
  with check (seller_id = public.current_seller_id());

-- tracking timeline visibility follows parcel visibility.
drop policy if exists "tracking: seller of shipment" on public.shipment_tracking_logs;
create policy "tracking: seller of shipment"
  on public.shipment_tracking_logs for select
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and s.seller_id = public.current_seller_id()
    )
  );

-- hubs: every authenticated user can read facilities; staff manage them.
alter table public.hubs enable row level security;
create policy "hubs: authenticated read"
  on public.hubs for select
  using (auth.uid() is not null);
create policy "hubs: staff manage"
  on public.hubs for all
  using (public.is_staff())
  with check (public.is_staff());

-- audit logs: admin read-only access through RLS.
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
drop policy if exists "audit_logs: admin read" on public.audit_logs;
create policy "audit_logs: admin read"
  on public.audit_logs for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9) NOTIFICATION GENERATION + SELLER ACTIVITY (definer-side triggers)
-- ---------------------------------------------------------------------------
-- Notify the parcel's seller account owner and/or assigned customer whenever
-- a parcel is registered. Status-change notifications are raised inside
-- update_parcel_status() below.
create or replace function public.notify_parcel_event(
  p_parcel public.shipments,
  p_title text,
  p_message text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seller account owner (profile linked via profiles.seller_id).
  insert into public.notifications (user_id, parcel_id, tracking_number, title, message, status)
  select p.id, p_parcel.id, p_parcel.tracking_number, p_title, p_message,
         p_parcel.status::text
    from public.profiles p
   where p.seller_id = p_parcel.seller_id
     and p.role = 'Seller';

  -- Assigned customer/recipient account.
  if p_parcel.client_id is not null then
    insert into public.notifications (user_id, parcel_id, tracking_number, title, message, status)
    values (p_parcel.client_id, p_parcel.id, p_parcel.tracking_number, p_title, p_message,
            p_parcel.status::text);
  end if;
end;
$$;

create or replace function public.on_parcel_registered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_parcel_event(
    new,
    'Parcel Registered',
    'Parcel ' || coalesce(new.tracking_number, new.reference) ||
      ' has been registered' ||
      case when new.seller_id is not null then ' for shipment.' else '.' end
  );
  return new;
end;
$$;

drop trigger if exists trg_parcel_registered on public.shipments;
create trigger trg_parcel_registered
  after insert on public.shipments
  for each row execute function public.on_parcel_registered();

-- Keep sellers.last_activity_at fresh on any parcel movement.
create or replace function public.touch_seller_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  v_seller := coalesce(new.seller_id, old.seller_id);
  if v_seller is not null then
    update public.sellers set last_activity_at = now() where id = v_seller;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_seller_activity on public.shipments;
create trigger trg_seller_activity
  after insert or update or delete on public.shipments
  for each row execute function public.touch_seller_activity();

drop trigger if exists trg_audit_sellers on public.sellers;
create trigger trg_audit_sellers
  after insert or update or delete on public.sellers
  for each row execute function public.log_audit();

drop trigger if exists trg_hubs_touch on public.hubs;
create trigger trg_hubs_touch before update on public.hubs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 10) ATOMIC STATUS UPDATE RPC — permission-checked, single round trip.
-- Updates the parcel, appends the tracking event, refreshes the hub/location,
-- raises notifications, and returns {ok, error} like post_tracking_update.
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
  if v_role is null or v_role not in ('Admin', 'Dispatcher', 'Planner') then
    return jsonb_build_object('ok', false, 'error',
      'Only operations staff can change parcel status');
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

grant execute on function public.update_parcel_status(uuid, text, text, uuid, text)
  to authenticated, service_role;
grant execute on function public.notify_parcel_event(public.shipments, text, text)
  to service_role;
grant execute on function public.next_parcel_tracking_number()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 11) Seed default hubs (only when empty)
-- ---------------------------------------------------------------------------
insert into public.hubs (name, code, city, province, address)
select * from (values
  ('Manila Distribution Hub', 'HUB-MNL', 'Manila', 'Metro Manila', 'Port Area, Manila'),
  ('Bulacan Sorting Hub', 'HUB-BUL', 'Malolos', 'Bulacan', 'McArthur Hwy, Malolos'),
  ('Cebu Distribution Hub', 'HUB-CEB', 'Cebu City', 'Cebu', 'North Reclamation Area'),
  ('Davao Distribution Hub', 'HUB-DVO', 'Davao City', 'Davao del Sur', 'Bajada, Davao City')
) as seed(name, code, city, province, address)
where not exists (select 1 from public.hubs limit 1);

-- ---------------------------------------------------------------------------
-- 13) Signup trigger: new self-service accounts default to the Customer role.
-- (Staff/Seller roles are provisioned by an administrator only.)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'Customer');
  resolved public.app_role;
begin
  resolved := case requested
    when 'Carrier' then 'Carrier'::public.app_role
    else 'Customer'::public.app_role
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    resolved
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
-- 12) Realtime — notify UIs of new notification rows
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when undefined_table then null; -- publication missing on fresh local DBs
end $$;
