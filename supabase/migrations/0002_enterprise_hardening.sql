-- =============================================================================
-- Enterprise hardening: indexing, constraints, audit log, reference sequences,
-- least-privilege grants, deactivation lockout. Idempotent for live DBs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- 2) Missing indexes for hot query paths
-- ---------------------------------------------------------------------------
create index if not exists shipments_created_idx
  on public.shipments (created_at desc);
create index if not exists shipments_status_created_idx
  on public.shipments (status, created_at desc);
create index if not exists shipments_client_created_idx
  on public.shipments (client_id, created_at desc);
create index if not exists shipments_carrier_created_idx
  on public.shipments (carrier_id, created_at desc);
create index if not exists shipments_mode_created_idx
  on public.shipments (mode, created_at desc);

-- Trigram GIN so the header search (reference / tracking / PO / client)
-- and the tracking ?q= filter stay fast on ILIKE '%term%'.
create index if not exists shipments_search_gin
  on public.shipments using gin (
    reference gin_trgm_ops,
    tracking_number gin_trgm_ops,
    po_number gin_trgm_ops,
    client_name gin_trgm_ops
  );

create index if not exists profiles_role_active_idx
  on public.profiles (role, is_active);
create index if not exists profiles_invited_by_idx
  on public.profiles (invited_by);

create index if not exists containers_created_idx
  on public.containers (created_at desc);
create index if not exists containers_status_idx
  on public.containers (status);

create index if not exists bol_created_idx
  on public.bills_of_lading (created_at desc);

create index if not exists po_created_idx
  on public.purchase_orders (created_at desc);
create index if not exists po_client_status_idx
  on public.purchase_orders (client_id, status);

create index if not exists load_plans_created_idx
  on public.load_plans (created_at desc);

-- ---------------------------------------------------------------------------
-- 3) Check constraints (NOT VALID: existing rows untouched, new rows enforced)
-- ---------------------------------------------------------------------------
alter table public.shipments
  add constraint shipments_non_negative
  check (weight_kg >= 0 and volume_cbm >= 0) not valid;

alter table public.shipments
  add constraint shipments_domestic_bounds
  check (
    (current_lat is not null and current_lat between 4.2 and 21.5)
    or current_lat is null
  ) not valid;

alter table public.shipments
  add constraint shipments_domestic_bounds_lng
  check (
    (current_lng is not null and current_lng between 116.0 and 127.0)
    or current_lng is null
  ) not valid;

alter table public.purchase_order_items
  add constraint po_items_non_negative
  check (qty_ordered >= 0 and qty_shipped >= 0 and unit_price >= 0) not valid;

-- ---------------------------------------------------------------------------
-- 4) Sequence-backed reference generation (no more Math.random collisions)
-- ---------------------------------------------------------------------------
create sequence if not exists public.shipments_ref_seq start 1000;
create sequence if not exists public.bol_ref_seq start 1000;
create sequence if not exists public.containers_ref_seq start 1000;

create or replace function public.next_shipment_reference()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'SHP-' || to_char(now(), 'YYYY') || '-' || nextval('public.shipments_ref_seq');
$$;

create or replace function public.next_bol_number(p_bol_type text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case when upper(p_bol_type) = 'MBL' then 'MBL' else 'HBL' end
    || '-' || to_char(now(), 'YYYY') || '-'
    || nextval('public.bol_ref_seq');
$$;

create or replace function public.next_container_reference()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'CONT-' || to_char(now(), 'YYYY') || '-' || nextval('public.containers_ref_seq');
$$;

-- ---------------------------------------------------------------------------
-- 5) Audit log with a shared trigger
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id   uuid,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_table_idx
  on public.audit_logs (table_name, created_at desc);

alter table public.audit_logs enable row level security;
-- No RLS policies: only the SECURITY DEFINER trigger (caller: postgres) writes.
revoke all on public.audit_logs from anon, authenticated;

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (table_name, record_id, action, actor_id, new_data)
    values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
    values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (table_name, record_id, action, actor_id, old_data)
    values (tg_table_name, old.id, tg_op, auth.uid(), to_jsonb(old));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_shipments on public.shipments;
create trigger trg_audit_shipments
  after insert or update or delete on public.shipments
  for each row execute function public.log_audit();
drop trigger if exists trg_audit_containers on public.containers;
create trigger trg_audit_containers
  after insert or update or delete on public.containers
  for each row execute function public.log_audit();
drop trigger if exists trg_audit_bol on public.bills_of_lading;
create trigger trg_audit_bol
  after insert or update or delete on public.bills_of_lading
  for each row execute function public.log_audit();
drop trigger if exists trg_audit_po on public.purchase_orders;
create trigger trg_audit_po
  after insert or update or delete on public.purchase_orders
  for each row execute function public.log_audit();
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.log_audit();
drop trigger if exists trg_audit_load_plans on public.load_plans;
create trigger trg_audit_load_plans
  after insert or update or delete on public.load_plans
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- 6) Deactivation lockout: an inactive profile resolves to NULL role, so every
--    RLS policy and gate refusibly denies data access immediately.
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select case when is_active then role else null end
    from public.profiles
   where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 7) Least-privilege grants
-- ---------------------------------------------------------------------------
-- No anonymous table/sequence access. RLS predicates still need the pure
-- helper functions, so keep those executable by anon/authenticated only.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public;

alter default privileges in schema public
  revoke all on tables from anon;
alter default privileges in schema public
  revoke all on sequences from anon;
alter default privileges in schema public
  revoke execute on functions from public;
alter default privileges in schema public
  revoke execute on functions from anon;

grant execute on function public.current_role()
  to anon, authenticated, service_role;
grant execute on function public.is_staff()
  to anon, authenticated, service_role;
grant execute on function public.is_ops()
  to anon, authenticated, service_role;
grant execute on function public.can_approve_load_plans()
  to anon, authenticated, service_role;

-- Mutation/RPC functions: authenticated sessions only.
grant execute on function public.post_tracking_update(
  uuid, text, text, double precision, double precision, int, public.shipment_status
) to authenticated, service_role;
grant execute on function public.next_shipment_reference()
  to authenticated, service_role;
grant execute on function public.next_bol_number(text)
  to authenticated, service_role;
grant execute on function public.next_container_reference()
  to authenticated, service_role;