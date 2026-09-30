-- =============================================================================
-- Fix "subquery must return only one column" on parcel status updates.
--
-- public.notify_parcel_event() takes a single `public.shipments` composite
-- argument, but update_parcel_status() and attach_parcel_customer() passed
-- `(select * from public.shipments where ...)` — a multi-column subquery —
-- as that argument. Postgres rejects it, so EVERY status update failed.
--
-- Fix: re-read the row into a %rowtype variable after the UPDATE and pass
-- the variable instead. Idempotent for live DBs.
-- =============================================================================

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
  v_updated public.shipments%rowtype;
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

  -- Re-read AFTER the update so the notification carries the new status.
  -- NOTE: do NOT inline `(select * ...)` here — a multi-column subquery
  -- cannot be passed as the single composite argument and raises
  -- "subquery must return only one column".
  select * into v_updated from public.shipments where id = p_parcel_id;

  perform public.notify_parcel_event(
    v_updated,
    'Parcel Update',
    'Parcel ' || coalesce(v_parcel.tracking_number, v_parcel.reference) ||
      ' is now ' || replace(v_new::text, '_', ' ') || '.' ||
      case when p_location is not null then ' Current location: ' || p_location || '.' else '' end
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.update_parcel_status(uuid, text, text, uuid, text)
  from anon, public;
grant execute on function public.update_parcel_status(uuid, text, text, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Same subquery bug in the recipient-attach RPC.
-- ---------------------------------------------------------------------------
create or replace function public.attach_parcel_customer(
  p_parcel_id      uuid,
  p_customer_email text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role     public.app_role;
  v_parcel   public.shipments%rowtype;
  v_updated  public.shipments%rowtype;
  v_customer public.profiles%rowtype;
begin
  if p_customer_email is null or btrim(p_customer_email) = '' then
    return jsonb_build_object('ok', false, 'error', 'Customer email is required');
  end if;

  select role into v_role from public.profiles where id = auth.uid();

  select * into v_parcel from public.shipments where id = p_parcel_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Parcel not found');
  end if;

  if v_role = 'Admin' then
    null; -- admins may reassign recipients at any stage
  elsif v_role = 'Seller'
        and v_parcel.seller_id = public.current_seller_id()
        and v_parcel.status::text = 'Registered' then
    null; -- sellers: own parcel, pre-dispatch only
  else
    return jsonb_build_object('ok', false, 'error',
      'You are not allowed to change this parcel''s recipient');
  end if;

  select * into v_customer
    from public.profiles
   where lower(email) = lower(btrim(p_customer_email))
     and role = 'Customer'
     and is_active
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error',
      'No registered customer account was found with that email');
  end if;

  -- Already attached? Treat as success (idempotent UI retries).
  if v_parcel.client_id = v_customer.id then
    return jsonb_build_object('ok', true);
  end if;

  update public.shipments
     set client_id = v_customer.id
   where id = p_parcel_id;

  -- See NOTE above: pass a row variable, never `(select * ...)`.
  select * into v_updated from public.shipments where id = p_parcel_id;

  -- Welcome notification so the customer immediately sees the parcel.
  perform public.notify_parcel_event(
    v_updated,
    'Parcel Assigned to You',
    'A parcel (' || coalesce(v_parcel.tracking_number, v_parcel.reference) ||
      ') has been assigned to your account.'
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.attach_parcel_customer(uuid, text) from anon, public;
grant execute on function public.attach_parcel_customer(uuid, text)
  to authenticated, service_role;
