-- =============================================================================
-- OPTIONAL demo seed. NOT loaded by the app (the app renders empty states
-- when tables are empty). Run manually in the Supabase SQL Editor only if you
-- want sample rows to explore the UI.
--
-- Prereq: create at least one auth user, then set the id below.
-- =============================================================================

-- Replace with a real auth.users id (e.g. the Dispatcher you registered).
-- select id from auth.users;  -- to find it
do $$
declare
  v_user uuid := (select id from auth.users order by created_at limit 1);
  v_ship uuid;
  v_cont uuid;
  v_po   uuid;
begin
  if v_user is null then
    raise notice 'No auth user found — register a user first, then re-run.';
    return;
  end if;

  insert into public.shipments
    (reference, tracking_number, client_name, shipper, consignee, origin, destination,
     mode, status, etd, eta, cargo_type, vessel, carrier, po_number, weight_kg, volume_cbm,
     incoterms, current_location, current_lat, current_lng, progress, created_by)
  values
    ('SHP-2026-8801', 'TRK-GLOBAL-99812', 'Apex Electronics Corp', 'Shenzhen Tech Exports Ltd',
     'Apex Logistics Whse (Los Angeles)', 'Shenzhen (CNSZX)', 'Los Angeles (USLAX)',
     'Ocean', 'In Transit', '2026-07-28', '2026-08-14', 'FCL 40HQ', 'EVER GIVEN V.042E',
     'Evergreen Marine', 'PO-99420', 22400, 64.5, 'FOB', 'Pacific Ocean', 28.4, -160.2, 62, v_user)
  returning id into v_ship;

  insert into public.shipment_tracking_logs (shipment_id, event_type, level, message, location, lat, lng, created_by)
  values (v_ship, 'gps', 'info', 'EVER GIVEN reported optimal course & speed', 'Pacific Ocean', 28.4, -160.2, v_user);

  insert into public.containers
    (reference, container_type, load_type, max_volume_cbm, max_weight_kg, current_volume_cbm,
     current_weight_kg, origin, destination, vessel, status, created_by)
  values
    ('CONT-40HQ-1029', '40ft High Cube Container', 'FCL', 76.2, 28600, 58.4, 21800,
     'Shanghai Port (CNSHA)', 'Rotterdam Port (NLRTM)', 'MAERSK MC-KINNEY MOLLER',
     'Loading in Progress', v_user)
  returning id into v_cont;

  insert into public.container_shipments (container_id, shipment_id) values (v_cont, v_ship);

  insert into public.purchase_orders (po_number, client_name, vendor, currency, total_amount, status, shipment_id, created_by)
  values ('PO-99420', 'Apex Electronics Corp', 'Shenzhen Microchip Assembly', 'USD', 245000, 'In Transit', v_ship, v_user)
  returning id into v_po;

  insert into public.purchase_order_items (po_id, sku, name, qty_ordered, qty_shipped, unit_price)
  values
    (v_po, 'MICRO-A900', '4K Display Processing Units', 5000, 5000, 35.00),
    (v_po, 'SENS-PX12', 'Optical LiDAR Sensors', 2000, 1200, 35.00);
end $$;
