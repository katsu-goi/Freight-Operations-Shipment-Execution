-- =============================================================================
-- Planner role + ML load plans (maker–checker). Idempotent for live DB.
-- Does NOT include enterprise invite-only / audit / is_active bans.
-- =============================================================================

-- 1) Enum: Planner
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'Planner'
  ) then
    alter type public.app_role add value 'Planner' after 'Dispatcher';
  end if;
end $$;

-- 2) Enum: load_plan_status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'load_plan_status') then
    create type public.load_plan_status as enum ('Draft', 'Approved', 'Rejected');
  end if;
end $$;

-- 3) Helpers
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

-- Safe signup role mapping (invalid metadata → Client, no cast abort).
-- Self-service signup may only claim untrusted roles; staff roles are
-- provisioned by an administrator only.
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

-- 4) Tables
create table if not exists public.load_plans (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  status             public.load_plan_status not null default 'Draft',
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

create table if not exists public.load_plan_items (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.load_plans (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  sequence_no int not null default 1,
  created_at  timestamptz not null default now(),
  unique (plan_id, shipment_id)
);

create index if not exists load_plans_status_idx on public.load_plans (status);
create index if not exists load_plan_items_plan_idx on public.load_plan_items (plan_id);

drop trigger if exists trg_load_plans_touch on public.load_plans;
create trigger trg_load_plans_touch
  before update on public.load_plans
  for each row execute function public.touch_updated_at();

-- 5) Refresh shipment/read policies to include Planner via is_ops()
alter table public.load_plans enable row level security;
alter table public.load_plan_items enable row level security;

drop policy if exists "shipments: scoped read" on public.shipments;
create policy "shipments: scoped read"
  on public.shipments for select
  using (
    public.is_ops()
    or carrier_id = auth.uid()
    or client_id = auth.uid()
  );

drop policy if exists "shipments: staff write" on public.shipments;
drop policy if exists "shipments: ops write" on public.shipments;
create policy "shipments: ops write"
  on public.shipments for insert
  with check (public.is_ops());

drop policy if exists "profiles: read own or staff reads all" on public.profiles;
drop policy if exists "profiles: read own or ops reads all" on public.profiles;
create policy "profiles: read own or ops reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_ops());

drop policy if exists "tracking: read if shipment visible" on public.shipment_tracking_logs;
create policy "tracking: read if shipment visible"
  on public.shipment_tracking_logs for select
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_id
        and (public.is_ops() or s.carrier_id = auth.uid() or s.client_id = auth.uid())
    )
  );

drop policy if exists "bol: read if shipment visible or staff" on public.bills_of_lading;
drop policy if exists "bol: read if shipment visible or ops" on public.bills_of_lading;
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

drop policy if exists "po: scoped read" on public.purchase_orders;
create policy "po: scoped read"
  on public.purchase_orders for select
  using (public.is_ops() or client_id = auth.uid());

drop policy if exists "po_items: read if po visible" on public.purchase_order_items;
create policy "po_items: read if po visible"
  on public.purchase_order_items for select
  using (
    exists (
      select 1 from public.purchase_orders p
      where p.id = po_id and (public.is_ops() or p.client_id = auth.uid())
    )
  );

-- Lock self role escalation on profile update
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Load plans RLS
drop policy if exists "load_plans: ops read" on public.load_plans;
create policy "load_plans: ops read"
  on public.load_plans for select
  using (public.is_ops());

drop policy if exists "load_plans: ops insert draft" on public.load_plans;
create policy "load_plans: ops insert draft"
  on public.load_plans for insert
  with check (public.is_ops() and status = 'Draft');

drop policy if exists "load_plans: staff or draft owner update" on public.load_plans;
create policy "load_plans: staff or draft owner update"
  on public.load_plans for update
  using (
    public.is_staff()
    or (public.is_ops() and status = 'Draft')
  )
  with check (
    public.is_staff()
    or (public.is_ops() and status = 'Draft')
  );

drop policy if exists "load_plans: staff or draft delete" on public.load_plans;
create policy "load_plans: staff or draft delete"
  on public.load_plans for delete
  using (
    public.is_staff()
    or (public.is_ops() and status = 'Draft' and created_by = auth.uid())
  );

drop policy if exists "load_plan_items: ops manage" on public.load_plan_items;
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
