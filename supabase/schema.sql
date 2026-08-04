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
create type app_role       as enum ('Admin', 'Dispatcher', 'Carrier', 'Client');
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
  currency     text not null default 'USD',
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

-- ---- profiles ----
create policy "profiles: read own or staff reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin manages all"
  on public.profiles for all
  using (public.current_role() = 'Admin')
  with check (public.current_role() = 'Admin');

-- ---- shipments ----
-- Staff (Admin/Dispatcher) see everything. Carriers see their assigned loads.
-- Clients see only their own shipments.
create policy "shipments: scoped read"
  on public.shipments for select
  using (
    public.is_staff()
    or carrier_id = auth.uid()
    or client_id = auth.uid()
  );

create policy "shipments: staff write"
  on public.shipments for insert
  with check (public.is_staff());

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
        and (public.is_staff() or s.carrier_id = auth.uid() or s.client_id = auth.uid())
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
create policy "bol: read if shipment visible or staff"
  on public.bills_of_lading for select
  using (
    public.is_staff()
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
  using (public.is_staff() or client_id = auth.uid());

create policy "po: staff manage"
  on public.purchase_orders for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "po_items: read if po visible"
  on public.purchase_order_items for select
  using (
    exists (
      select 1 from public.purchase_orders p
      where p.id = po_id and (public.is_staff() or p.client_id = auth.uid())
    )
  );

create policy "po_items: staff manage"
  on public.purchase_order_items for all
  using (public.is_staff())
  with check (public.is_staff());

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

-- Auto-create a profile row when a new auth user signs up.
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
    coalesce((new.raw_user_meta_data ->> 'role')::app_role, 'Client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
