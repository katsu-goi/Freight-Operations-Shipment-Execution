-- =============================================================================
-- Freight Operations & Shipment Execution Subsystem
-- Supabase / PostgreSQL schema
--
-- Apply in the Supabase SQL Editor (or `supabase db push`).
-- Ordering: extensions -> enums -> tables -> indexes -> RBAC helpers
--           -> RLS policies -> realtime -> triggers -> auth hook.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type app_role       as enum ('Admin', 'Dispatcher', 'Planner', 'Carrier', 'Client');
create type transport_mode as enum ('Ocean', 'Air', 'Road', 'Rail');
create type shipment_status as enum (
  'Booked', 'In Transit', 'Customs Hold', 'Delivered', 'Cancelled', 'Delayed'
);
create type container_status as enum (
  'Planned', 'Loading in Progress', 'Sealed & Staged', 'In Transit', 'Deconsolidated'
);
create type bol_type        as enum ('HBL', 'MBL');
create type po_status       as enum ('Open', 'In Transit', 'Customs Hold', 'Delivered', 'Closed', 'Cancelled');
create type load_type       as enum ('LCL', 'FCL');

-- =============================================================================
-- PROFILES (RBAC) — 1:1 with auth.users
-- =============================================================================
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  role        app_role not null default 'Client',
  org_name    text,
  is_active   boolean not null default true,
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'User profile + role. Row is created automatically on signup.';

-- =============================================================================
-- SHIPMENTS
-- =============================================================================
create table public.shipments (
  id               uuid primary key default gen_random_uuid(),
  reference        text unique not null,             -- e.g. SHP-2026-8801
  tracking_number  text unique,
  client_name      text not null,
  shipper          text,
  consignee        text,
  origin           text not null,
  destination      text not null,
  mode             transport_mode not null,
  status           shipment_status not null default 'Booked',
  etd              date,
  eta              date,
  container_no     text,
  cargo_type       text,                              -- e.g. 'FCL 40HQ', 'Air Express'
  vessel           text,
  carrier          text,
  po_number        text,
  weight_kg        numeric(12,2) default 0,
  volume_cbm       numeric(12,2) default 0,
  hazard_class     text default 'None',
  incoterms        text,
  current_location text,
  current_lat      double precision,
  current_lng      double precision,
  progress         int not null default 0 check (progress between 0 and 100),
  -- Ownership / RBAC scoping
  client_id        uuid references public.profiles (id) on delete set null,
  carrier_id       uuid references public.profiles (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index shipments_status_idx  on public.shipments (status);
create index shipments_mode_idx    on public.shipments (mode);
create index shipments_client_idx  on public.shipments (client_id);
create index shipments_carrier_idx on public.shipments (carrier_id);
create index shipments_po_idx      on public.shipments (po_number);

-- =============================================================================
-- SHIPMENT TRACKING LOGS  (Supabase Realtime source)
-- =============================================================================
create table public.shipment_tracking_logs (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  event_type  text not null default 'status',        -- status | gps | telemetry | system | booking
  message     text not null,
  level       text not null default 'info',          -- info | success | warning | error
  lat         double precision,
  lng         double precision,
  location    text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index tracking_logs_shipment_idx on public.shipment_tracking_logs (shipment_id, created_at desc);

-- =============================================================================
-- CONTAINERS  (Consolidation / Deconsolidation)
-- =============================================================================
create table public.containers (
  id                 uuid primary key default gen_random_uuid(),
  reference          text unique not null,            -- e.g. CONT-40HQ-1029
  container_type     text not null,                   -- '40ft High Cube Container'
  load_type          load_type not null default 'FCL',
  max_volume_cbm     numeric(12,2) not null,
  max_weight_kg      numeric(12,2) not null,
  current_volume_cbm numeric(12,2) not null default 0,
  current_weight_kg  numeric(12,2) not null default 0,
  origin             text,
  destination        text,
  vessel             text,
  status             container_status not null default 'Planned',
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Junction: which shipments are consolidated into which container.
create table public.container_shipments (
  container_id uuid not null references public.containers (id) on delete cascade,
  shipment_id  uuid not null references public.shipments (id) on delete cascade,
  loaded_at    timestamptz not null default now(),
  primary key (container_id, shipment_id)
);

-- Utilization can never exceed a container's capacity.
alter table public.containers
  add constraint containers_within_capacity
  check (
    current_weight_kg between 0 and max_weight_kg
    and current_volume_cbm between 0 and max_volume_cbm
  );

-- =============================================================================
-- BILLS OF LADING  (House / Master)
-- =============================================================================
create table public.bills_of_lading (
  id                 uuid primary key default gen_random_uuid(),
  bol_number         text unique not null,            -- HBL-2026-90112 / MBL-...
  bol_type           bol_type not null,
  shipment_id        uuid references public.shipments (id) on delete set null,
  master_bol_id      uuid references public.bills_of_lading (id) on delete set null, -- HBLs point to their MBL
  shipper_name       text,
  consignee_name     text,
  notify_party       text,
  vessel_name        text,
  voyage_no          text,
  port_of_loading    text,
  port_of_discharge  text,
  place_of_delivery  text,
  container_number   text,
  seal_number        text,
  total_weight_kg    numeric(12,2),
  total_volume_cbm   numeric(12,2),
  goods_description  text,
  freight_terms      text,                            -- Prepaid / Collect
  issued_date        date,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index bol_shipment_idx on public.bills_of_lading (shipment_id);
create index bol_master_idx   on public.bills_of_lading (master_bol_id);

-- =============================================================================
-- PURCHASE ORDERS + line items
-- =============================================================================
create table public.purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  po_number    text unique not null,
  client_name  text not null,
  vendor       text,
  currency     text not null default 'PHP',
  total_amount numeric(14,2) not null default 0,
  status       po_status not null default 'Open',
  shipment_id  uuid references public.shipments (id) on delete set null,
  client_id    uuid references public.profiles (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.purchase_order_items (
  id           uuid primary key default gen_random_uuid(),
  po_id        uuid not null references public.purchase_orders (id) on delete cascade,
  sku          text not null,
  name         text not null,
  qty_ordered  numeric(12,2) not null default 0,
  qty_shipped  numeric(12,2) not null default 0,
  unit_price   numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

create index po_items_po_idx on public.purchase_order_items (po_id);
create index po_shipment_idx on public.purchase_orders (shipment_id);

-- =============================================================================
-- ML LOAD PLANS (maker–checker)
-- =============================================================================
create type load_plan_status as enum ('Draft', 'Approved', 'Rejected');

create table public.load_plans (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  status             load_plan_status not null default 'Draft',
  vehicle_ref        text,
  origin             text,
  destination        text,
  max_weight_kg      numeric(12,2) not null default 20000,
  max_volume_cbm     numeric(12,3) not null default 60,
  planned_weight_kg  numeric(12,2) not null default 0,
  planned_volume_cbm numeric(12,3) not null default 0,
  utilization_pct    numeric(5,2) not null default 0
                       check (utilization_pct >= 0 and utilization_pct <= 100),
  ml_score           numeric(5,2),
  ml_rationale       text,
  created_by         uuid references public.profiles (id) on delete set null,
  approved_by        uuid references public.profiles (id) on delete set null,
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.load_plan_items (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.load_plans (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  sequence_no int not null default 1,
  created_at  timestamptz not null default now(),
  unique (plan_id, shipment_id)
);

create index load_plans_status_idx on public.load_plans (status);
create index load_plan_items_plan_idx on public.load_plan_items (plan_id);

-- =============================================================================
-- RBAC HELPER FUNCTIONS
-- =============================================================================
-- SECURITY DEFINER so policies can read the caller's role without recursion.
create or replace function public.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('Admin', 'Dispatcher'), false);
$$;

create or replace function public.is_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_role() in ('Admin', 'Dispatcher', 'Planner'),
    false
  );
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

-- =============================================================================
-- ATOMIC TRACKING UPDATE
-- Inserts the tracking log and updates the shipment position/status in a single
-- database call. Centralizes authorization (staff, or the assigned carrier)
-- and the Philippine-bounds guard so they cannot be bypassed by an RLS misconfig.
-- =============================================================================
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
  select role into v_role
    from public.profiles
    where id = auth.uid();

  select * into v_ship
    from public.shipments
    where id = p_shipment_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Shipment not found');
  end if;

  -- Authorization: staff, or the carrier assigned to this shipment only.
  if v_role is null or (
    v_role not in ('Admin', 'Dispatcher')
    and not (v_role = 'Carrier' and v_ship.carrier_id = auth.uid())
  ) then
    return jsonb_build_object('ok', false, 'error', 'Your role cannot post tracking updates');
  end if;

  -- Protective bounds: domestic Philippine tracking only.
  if p_lat is not null and p_lng is not null
     and (p_lat < 4.2 or p_lat > 21.5 or p_lng < 116.0 or p_lng > 127.0) then
    return jsonb_build_object('ok', false, 'error', 'Coordinates must be inside the Philippines');
  end if;

  v_level := case when p_status = 'Customs Hold'::shipment_status then 'warning' else 'info' end;

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

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles              enable row level security;
alter table public.shipments             enable row level security;
alter table public.shipment_tracking_logs enable row level security;
alter table public.containers            enable row level security;
alter table public.container_shipments   enable row level security;
alter table public.bills_of_lading       enable row level security;
alter table public.purchase_orders       enable row level security;
alter table public.purchase_order_items  enable row level security;
alter table public.load_plans            enable row level security;
alter table public.load_plan_items       enable row level security;

-- ---- profiles ----
create policy "profiles: read own or ops reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_ops());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "profiles: admin manages all"
  on public.profiles for all
  using (public.current_role() = 'Admin')
  with check (public.current_role() = 'Admin');

-- ---- shipments ----
-- Ops (Admin/Dispatcher/Planner) see everything. Carriers/Clients scoped.
create policy "shipments: scoped read"
  on public.shipments for select
  using (
    public.is_ops()
    or carrier_id = auth.uid()
    or client_id = auth.uid()
  );

create policy "shipments: ops write"
  on public.shipments for insert
  with check (public.is_ops());

create policy "shipments: staff or carrier update"
  on public.shipments for update
  using (public.is_staff() or carrier_id = auth.uid())
  with check (public.is_staff() or carrier_id = auth.uid());

create policy "shipments: admin delete"
  on public.shipments for delete
  using (public.current_role() = 'Admin');

-- ---- tracking logs ----
create policy "tracking: read if shipment visible"
  on public.shipment_tracking_logs for select
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (public.is_ops() or s.carrier_id = auth.uid() or s.client_id = auth.uid())
    )
  );

create policy "tracking: staff or carrier insert"
  on public.shipment_tracking_logs for insert
  with check (
    public.is_staff()
    or exists (select 1 from public.shipments s where s.id = shipment_id and s.carrier_id = auth.uid())
  );

-- ---- containers (staff only manage; clients/carriers read) ----
create policy "containers: authenticated read"
  on public.containers for select
  using (auth.uid() is not null);

create policy "containers: staff manage"
  on public.containers for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "container_shipments: authenticated read"
  on public.container_shipments for select
  using (auth.uid() is not null);

create policy "container_shipments: staff manage"
  on public.container_shipments for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---- bills of lading ----
create policy "bol: read if shipment visible or ops"
  on public.bills_of_lading for select
  using (
    public.is_ops()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (s.carrier_id = auth.uid() or s.client_id = auth.uid())
    )
  );

create policy "bol: staff manage"
  on public.bills_of_lading for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---- purchase orders ----
create policy "po: scoped read"
  on public.purchase_orders for select
  using (public.is_ops() or client_id = auth.uid());

create policy "po: staff manage"
  on public.purchase_orders for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "po_items: read if po visible"
  on public.purchase_order_items for select
  using (
    exists (
      select 1 from public.purchase_orders p
      where p.id = po_id and (public.is_ops() or p.client_id = auth.uid())
    )
  );

create policy "po_items: staff manage"
  on public.purchase_order_items for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---- load plans (maker–checker) ----
create policy "load_plans: ops read"
  on public.load_plans for select
  using (public.is_ops());

create policy "load_plans: ops insert draft"
  on public.load_plans for insert
  with check (public.is_ops() and status = 'Draft');

create policy "load_plans: staff or draft owner update"
  on public.load_plans for update
  using (public.is_staff() or (public.is_ops() and status = 'Draft'))
  with check (public.is_staff() or (public.is_ops() and status = 'Draft'));

create policy "load_plans: staff or draft delete"
  on public.load_plans for delete
  using (
    public.is_staff()
    or (public.is_ops() and status = 'Draft' and created_by = auth.uid())
  );

create policy "load_plan_items: ops manage"
  on public.load_plan_items for all
  using (
    public.is_staff()
    or exists (
      select 1 from public.load_plans lp
      where lp.id = plan_id and public.is_ops() and lp.status = 'Draft'
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.load_plans lp
      where lp.id = plan_id and public.is_ops() and lp.status = 'Draft'
    )
  );

-- =============================================================================
-- REALTIME — publish the tables the UI subscribes to
-- =============================================================================
alter publication supabase_realtime add table public.shipments;
alter publication supabase_realtime add table public.shipment_tracking_logs;
alter publication supabase_realtime add table public.containers;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_shipments_touch   before update on public.shipments        for each row execute function public.touch_updated_at();
create trigger trg_containers_touch  before update on public.containers       for each row execute function public.touch_updated_at();
create trigger trg_bol_touch         before update on public.bills_of_lading  for each row execute function public.touch_updated_at();
create trigger trg_po_touch          before update on public.purchase_orders  for each row execute function public.touch_updated_at();
create trigger trg_profiles_touch    before update on public.profiles         for each row execute function public.touch_updated_at();
create trigger trg_load_plans_touch  before update on public.load_plans       for each row execute function public.touch_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'Client');
  resolved public.app_role;
begin
  -- Self-service signup may only claim untrusted roles. Staff roles
  -- (Admin/Dispatcher/Planner) are provisioned by an administrator only;
  -- any other requested role demotes to Client.
  resolved := case requested
    when 'Carrier' then 'Carrier'::public.app_role
    else 'Client'::public.app_role
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

-- =============================================================================
-- PRIVILEGES — mirror hosted Supabase defaults so PostgREST can serve the
-- tables/functions through the REST + Realtime endpoints. Row-level security
-- (RLS policies above) still governs which rows/functions each role may use.
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
