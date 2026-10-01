-- =============================================================================
-- Seller-generated customer tracking links (2026-09-30).
--
-- A seller can generate a private, revocable tracking link (/t/<token>) for
-- one of their own parcels so the customer can view read-only tracking info
-- without an account. Only SHA-256 hashes are stored — never raw tokens.
--
-- Additive only: one new table + one read-only lookup function. No existing
-- table, policy, or function is altered. Existing data is untouched.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Link store. RLS enabled with NO policies: all access is server-side
--    (service role) through ownership-checked server actions and the
--    SECURITY DEFINER lookup below — mirroring email_verification_codes.
-- ---------------------------------------------------------------------------
create table if not exists public.parcel_tracking_links (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.shipments (id) on delete cascade,
  token_hash text not null unique,
  label text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists parcel_tracking_links_parcel_idx
  on public.parcel_tracking_links (parcel_id);
create index if not exists parcel_tracking_links_active_idx
  on public.parcel_tracking_links (parcel_id)
  where revoked_at is null;

alter table public.parcel_tracking_links enable row level security;
-- Intentionally no policies: app access is service-role only (server actions).

-- ---------------------------------------------------------------------------
-- 2) Public read-only lookup. Returns ONLY customer-appropriate fields
--    (no internal ids, no seller/client references, no actor ids).
--    Missing, unknown, expired, and revoked tokens all yield the identical
--    {ok:false} shape so callers cannot probe for parcels or tokens.
-- ---------------------------------------------------------------------------
create or replace function public.get_parcel_by_tracking_token(
  p_token_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link   public.parcel_tracking_links%rowtype;
  v_parcel public.shipments%rowtype;
begin
  if p_token_hash is null or p_token_hash = '' then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_link
    from public.parcel_tracking_links
   where token_hash = p_token_hash
     and revoked_at is null
     and (expires_at is null or expires_at > now());

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_parcel
    from public.shipments
   where id = v_link.parcel_id;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'parcel', jsonb_build_object(
      'tracking_number', v_parcel.tracking_number,
      'reference', v_parcel.reference,
      'status', v_parcel.status,
      'delivery_method', v_parcel.delivery_method,
      'platform', v_parcel.platform,
      'origin', v_parcel.origin,
      'destination', v_parcel.destination,
      'expected_delivery_date', v_parcel.expected_delivery_date,
      'created_at', v_parcel.created_at,
      'updated_at', v_parcel.updated_at
    ),
    'events', coalesce((
      select jsonb_agg(e order by e.created_at)
        from (
          select status, message, location, event_type, level, created_at
            from public.shipment_tracking_logs
           where shipment_id = v_parcel.id
           order by created_at asc
        ) e
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_parcel_by_tracking_token(text)
  to anon, authenticated, service_role;
