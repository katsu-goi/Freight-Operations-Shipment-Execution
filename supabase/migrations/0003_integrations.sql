-- =============================================================================
-- Integration support: idempotent CRM/webhook ingestion ledger. Idempotent.
-- =============================================================================
create table if not exists public.webhook_events (
  id               bigint generated always as identity primary key,
  source           text not null,
  event_type       text not null,
  idempotency_key  text not null,
  payload          jsonb not null,
  status           text not null default 'received'
                     check (status in ('received', 'processed', 'failed')),
  error            text,
  created_at       timestamptz not null default now(),
  processed_at     timestamptz,
  unique (source, idempotency_key)
);

create index if not exists webhook_events_status_idx
  on public.webhook_events (status, created_at desc);

alter table public.webhook_events enable row level security;
-- Only the SECURITY DEFINER RPCs write; no direct client access.
revoke all on public.webhook_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- CRM purchase order ingestion with idempotency. Returns ok / duplicate / error.
-- ---------------------------------------------------------------------------
create or replace function public.ingest_crm_po(
  p_idempotency_key text,
  p_po_number       text,
  p_client_name     text,
  p_vendor          text,
  p_currency        text,
  p_total_amount    numeric,
  p_client_email    text,
  p_items           jsonb,   -- [{sku,name,qty_ordered,unit_price}]
  p_notes           text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item    jsonb;
  v_po_id   uuid;
  v_client  uuid;
  v_count   int;
begin
  -- Idempotency: skip if this source/key combination was already applied.
  select count(*) into v_count from public.webhook_events
    where idempotency_key = p_idempotency_key and source = 'crm'
      and status <> 'failed';
  if v_count > 0 then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  insert into public.webhook_events (source, event_type, idempotency_key, payload)
  values ('crm', 'po.upsert', p_idempotency_key, jsonb_build_object(
    'po_number', p_po_number, 'client_name', p_client_name, 'vendor', p_vendor,
    'currency', p_currency, 'total_amount', p_total_amount,
    'client_email', p_client_email, 'items', p_items
  ));

  -- Match an existing client profile by email if possible.
  select id into v_client from public.profiles
    where email = p_client_email and role = 'Client' limit 1;

  insert into public.purchase_orders
    (po_number, client_name, vendor, currency, total_amount, client_id,
     created_by, status)
  values
    (p_po_number, p_client_name, p_vendor,
     coalesce(nullif(p_currency, ''), 'PHP'), coalesce(p_total_amount, 0),
     v_client, v_client, 'Open')
  returning id into v_po_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.purchase_order_items
      (po_id, sku, name, qty_ordered, qty_shipped, unit_price)
    values (
      v_po_id,
      coalesce(v_item ->> 'sku', ''),
      coalesce(v_item ->> 'name', ''),
      coalesce((v_item ->> 'qty_ordered')::numeric, 0),
      0,
      coalesce((v_item ->> 'unit_price')::numeric, 0)
    );
  end loop;

  update public.webhook_events
     set status = 'processed', processed_at = now()
   where source = 'crm' and idempotency_key = p_idempotency_key;

  return jsonb_build_object('ok', true, 'duplicate', false, 'po_id', v_po_id);
end;
$$;

grant execute on function public.ingest_crm_po(
  text, text, text, text, text, numeric, text, jsonb, text
) to service_role;