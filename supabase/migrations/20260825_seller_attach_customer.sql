-- =============================================================================
-- Allow sellers to attach a REGISTERED customer account to their own parcel
-- while it is still 'Registered'. Admin may do it at any stage.
--
-- Why an RPC: sellers cannot write shipments.client_id directly (RLS blocks
-- it), so this SECURITY DEFINER function performs the lookup + write with its
-- own authorization checks:
--   * Admin            -> any parcel, any status
--   * Seller           -> ONLY their own parcel, ONLY while 'Registered'
--   * Customer         -> never
-- The target must be an existing active Customer account; unknown emails are
-- reported back instead of guessed (no enumeration beyond yes/no per parcel
-- the caller already owns).
-- Idempotent for live DBs.
-- =============================================================================

create or replace function public.attach_parcel_customer(
  p_parcel_id      uuid,
  p_customer_email text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    public.app_role;
  v_parcel  public.shipments%rowtype;
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

  -- Welcome notification so the customer immediately sees the parcel.
  perform public.notify_parcel_event(
    (select * from public.shipments where id = p_parcel_id),
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
