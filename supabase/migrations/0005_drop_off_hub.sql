-- =============================================================================
-- Pivot to E-Commerce Authorized Drop-Off Hub operations ("Airship Express").
--
-- The heavy multimodal freight model (containers, load plans, ports, global
-- routing) is retired. The hub's core loop is now:
--   Seller pickup / walk-in intake  →  booking with delivery platform
--   →  courier batching  →  handover to third-party carrier (end of scope).
--
-- This migration is ADDITIVE: it adds the hub-specific tables/columns and
-- leaves existing freight tables in place (dormant) so no historical data is
-- destroyed. Idempotent for live DBs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------
create type delivery_platform as enum (
  'J&T Express',
  'Flash Express',
  'LBC Express',
  'GoGo Xpress',
  'Shopee Drop-Off',
  'Lazada Drop-Off',
  'TikTok Shop Drop-Off',
  'Custom Partner'
);

create type pickup_status as enum (
  'Scheduled',
  'In Transit',
  'Received',
  'No Show',
  'Cancelled'
);

create type batch_status as enum (
  'Draft',
  'Ready',
  'Handed Over'
);

-- Extend the parcel lifecycle with hub-local stages. Existing freight status
-- values remain in the enum for backward compatibility but are no longer used.
alter type shipment_status add value if not exists 'Intake';
alter type shipment_status add value if not exists 'Batched';
alter type shipment_status add value if not exists 'Handed Over';
alter type shipment_status add value if not exists 'Archived';

-- ---------------------------------------------------------------------------
-- SELLERS — regular high-volume sellers the hub services
-- ---------------------------------------------------------------------------
create table public.sellers (
  id               uuid primary key default gen_random_uuid(),
  reference        text unique not null,        -- SELL-2026-0001
  name             text not null,
  contact_person   text,
  phone            text,
  email            text,
  address          text,
  pickup_frequency text,                        -- Daily / Weekly / On-demand
  notes            text,
  is_active        boolean not null default true,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index sellers_name_idx on public.sellers (name);

-- ---------------------------------------------------------------------------
-- PICKUP REQUESTS — scheduled/recorded pickups for regular sellers
-- ---------------------------------------------------------------------------
create table public.pickup_requests (
  id           uuid primary key default gen_random_uuid(),
  reference    text unique not null,            -- PKUP-2026-0001
  seller_id    uuid not null references public.sellers (id) on delete cascade,
  scheduled_at timestamptz not null,
  status       pickup_status not null default 'Scheduled',
  parcel_count int not null default 0 check (parcel_count >= 0),
  notes        text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index pickup_requests_seller_idx on public.pickup_requests (seller_id, scheduled_at desc);
create index pickup_requests_status_idx on public.pickup_requests (status);

-- ---------------------------------------------------------------------------
-- SHIPMENTS — now a local parcel / booking record
-- (adds platform + seller + lifecycle columns; freight columns stay dormant)
-- ---------------------------------------------------------------------------
alter table public.shipments
  add column if not exists platform     delivery_platform not null default 'Custom Partner',
  add column if not exists seller_id    uuid references public.sellers (id) on delete set null,
  add column if not exists service_type text not null default 'Standard',  -- Standard / COD / etc.
  add column if not exists cod_amount   numeric(12,2) not null default 0,
  add column if not exists cancel_reason text,
  add column if not exists archived_at  timestamptz;

alter table public.shipments
  add constraint shipments_cod_amount_check check (cod_amount >= 0);

create index shipments_platform_idx on public.shipments (platform);
create index shipments_archived_idx  on public.shipments (archived_at) where archived_at is not null;

-- ---------------------------------------------------------------------------
-- CARRIER BATCHES — parcels grouped per partner courier platform
-- ---------------------------------------------------------------------------
create table public.carrier_batches (
  id                uuid primary key default gen_random_uuid(),
  reference         text unique not null,       -- BATCH-2026-0001
  platform          delivery_platform not null,
  status            batch_status not null default 'Draft',
  parcel_count      int not null default 0 check (parcel_count >= 0),
  total_weight_kg   numeric(12,2) not null default 0,
  rider_name        text,
  rider_phone       text,
  handover_notes    text,
  handed_over_by    uuid references public.profiles (id) on delete set null,
  handed_over_at    timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index carrier_batches_platform_idx on public.carrier_batches (platform, status);

-- Junction: parcels contained in a batch.
create table public.carrier_batch_items (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.carrier_batches (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  sequence_no int not null default 1,
  created_at  timestamptz not null default now(),
  unique (batch_id, shipment_id)
);

create index carrier_batch_items_batch_idx   on public.carrier_batch_items (batch_id);
create index carrier_batch_items_shipment_idx on public.carrier_batch_items (shipment_id);

-- ---------------------------------------------------------------------------
-- HANDOVERS — immutable sign-off log when a batch goes to the carrier rider
-- ---------------------------------------------------------------------------
create table public.handovers (
  id             uuid primary key default gen_random_uuid(),
  batch_id       uuid references public.carrier_batches (id) on delete set null,
  platform       delivery_platform not null,
  rider_name     text not null,
  rider_phone    text,
  parcel_count   int not null default 0 check (parcel_count >= 0),
  notes          text,
  handed_over_by uuid references public.profiles (id) on delete set null,
  handed_over_at timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index handovers_batch_idx on public.handovers (batch_id);
create index handovers_date_idx  on public.handovers (handed_over_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.sellers           enable row level security;
alter table public.pickup_requests   enable row level security;
alter table public.carrier_batches   enable row level security;
alter table public.carrier_batch_items enable row level security;
alter table public.handovers         enable row level security;

-- ---- sellers ----
create policy "sellers: ops read"
  on public.sellers for select
  using (public.is_ops());
create policy "sellers: staff manage"
  on public.sellers for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---- pickup_requests ----
create policy "pickups: ops read"
  on public.pickup_requests for select
  using (public.is_ops());
create policy "pickups: staff manage"
  on public.pickup_requests for all
  using (public.is_staff())
  with check (public.is_staff());

-- ---- carrier_batches ----
create policy "batches: ops read"
  on public.carrier_batches for select
  using (public.is_ops());
create policy "batches: ops insert"
  on public.carrier_batches for insert
  with check (public.is_ops());
create policy "batches: staff or ops draft update"
  on public.carrier_batches for update
  using (public.is_staff() or (public.is_ops() and status = 'Draft'))
  with check (public.is_staff() or (public.is_ops() and status = 'Draft'));

-- ---- carrier_batch_items ----
create policy "batch_items: ops read"
  on public.carrier_batch_items for select
  using (public.is_ops());
create policy "batch_items: ops manage"
  on public.carrier_batch_items for all
  using (public.is_staff() or public.is_ops())
  with check (public.is_staff() or public.is_ops());

-- ---- handovers ----
create policy "handovers: ops read"
  on public.handovers for select
  using (public.is_ops());
create policy "handovers: staff insert"
  on public.handovers for insert
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- REALTIME — the tables the hub UI subscribes to
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.shipments;
alter publication supabase_realtime add table public.carrier_batches;
alter publication supabase_realtime add table public.handovers;

-- ---------------------------------------------------------------------------
-- TRIGGERS — updated_at maintenance for the new tables
-- ---------------------------------------------------------------------------
create trigger trg_sellers_touch          before update on public.sellers           for each row execute function public.touch_updated_at();
create trigger trg_pickups_touch          before update on public.pickup_requests   for each row execute function public.touch_updated_at();
create trigger trg_carrier_batches_touch  before update on public.carrier_batches   for each row execute function public.touch_updated_at();
