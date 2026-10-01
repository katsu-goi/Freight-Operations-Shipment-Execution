-- =============================================================================
-- Core requirements: expanded RBAC (SuperAdmin / Admin / Seller / Customer /
-- Citizen), AI training store, and tightened staff helpers.
--
-- * SuperAdmin + Citizen enum values are added in the EARLIER, committed
--   migration 20260919_add_superadmin_citizen_enum (Postgres forbids using a
--   newly added enum value in the same transaction — SQLSTATE 55P04 — so the
--   ADD VALUE must commit before this file's functions reference the values).
-- * is_staff()/is_ops() now cover SuperAdmin as a privilege superset of Admin.
-- * New helpers: is_superadmin(), is_admin_or_above().
-- * New tables: ai_training_examples (few-shot "Train your AI" store),
--   ai_training_jobs (training run ledger). RLS: staff write, staff read.
--   (Email OTP expiry itself is enforced by GoTrue via auth.email.otp_expiry
--   = 90s in supabase/config.toml — no custom table needed.)
-- * Reporting/export needs no new table (computed from shipments live).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RBAC helpers: SuperAdmin inherits every Admin power
-- (Enum values already committed by 20260919 — safe to reference here.)
-- ---------------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'SuperAdmin', false);
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('SuperAdmin', 'Admin'), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('SuperAdmin', 'Admin'), false);
$$;

create or replace function public.is_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('SuperAdmin', 'Admin'), false);
$$;

grant execute on function public.is_superadmin() to anon, authenticated, service_role;
grant execute on function public.is_admin_or_above() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tighten status-update RPCs to the expanded staff set
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
  if v_role is null or v_role not in ('SuperAdmin', 'Admin') then
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

  return jsonb_build_object('ok', true);
end;
$$;

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
  if v_role is null or v_role not in ('SuperAdmin', 'Admin') then
    return jsonb_build_object('ok', false, 'error',
      'Only administrators can post tracking updates');
  end if;

  select * into v_ship from public.shipments where id = p_shipment_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Shipment not found');
  end if;

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

-- ---------------------------------------------------------------------------
-- AI training store ("Train your AI" — few-shot examples + job ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('routing', 'bol_parse')),
  input text not null,
  expected_output text not null,
  notes text not null default '',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_training_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'Queued' check (status in ('Queued', 'Running', 'Completed', 'Failed')),
  example_count int not null default 0,
  model_hint text not null default 'few-shot-prompt',
  summary text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.ai_training_examples enable row level security;
alter table public.ai_training_jobs enable row level security;

drop policy if exists "ai_training: staff all" on public.ai_training_examples;
create policy "ai_training: staff all"
  on public.ai_training_examples for all
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "ai_jobs: staff all" on public.ai_training_jobs;
create policy "ai_jobs: staff all"
  on public.ai_training_jobs for all
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

create index if not exists ai_training_examples_kind_idx
  on public.ai_training_examples (kind) where is_active = true;
create index if not exists ai_training_examples_created_idx
  on public.ai_training_examples (created_at desc);
