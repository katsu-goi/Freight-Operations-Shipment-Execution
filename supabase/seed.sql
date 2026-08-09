-- =============================================================================
-- Demo seed (Philippine domestic corridors).
-- Applies automatically on `supabase db reset` (local) or run in SQL Editor.
-- Creates demo auth users with working passwords, provisions their profiles,
-- and loads sample shipments/tracking/containers/POs tied to them.
-- =============================================================================

do $$
declare
  v_admin    uuid;
  v_carrier  uuid;
  v_client   uuid;
  v_ship     uuid;
  v_cont     uuid;
  v_po       uuid;
  v_pass     text := crypt('DemoPass!123', gen_salt('bf'));
begin
  -- ---- demo users (idempotent: skip if already registered) ----
  if not exists (select 1 from auth.users where email = 'admin@demo.local') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'admin@demo.local', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Admin","full_name":"Demo Admin"}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'carrier@demo.local') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'carrier@demo.local', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Carrier","full_name":"Demo Carrier"}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'client@demo.local') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'client@demo.local', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Client","full_name":"Demo Client"}',
       now(), now());
  end if;

  -- ---- provision profiles (trigger demotes sign-up roles, so staff demos
  --      are elevated explicitly here for development/demo purposes) ----
  select id into v_admin from auth.users where email = 'admin@demo.local';
  insert into public.profiles (id, full_name, email, role, org_name)
  values (v_admin, 'Demo Admin', 'admin@demo.local', 'Admin', 'Airship Express Ops')
  on conflict (id) do update set role = 'Admin';

  select id into v_carrier from auth.users where email = 'carrier@demo.local';
  insert into public.profiles (id, full_name, email, role, org_name)
  values (v_carrier, 'Demo Carrier', 'carrier@demo.local', 'Carrier', 'Demo Trucking Co.')
  on conflict (id) do update set role = 'Carrier';

  select id into v_client from auth.users where email = 'client@demo.local';
  insert into public.profiles (id, full_name, email, role, org_name)
  values (v_client, 'Demo Client', 'client@demo.local', 'Client', 'Jollibee Foods Logistics')
  on conflict (id) do update set role = 'Client';

  -- ---- sample data (skip when already loaded) ----
  if exists (select 1 from public.shipments) then
    raise notice 'Demo shipments already present; skipping data seeding.';
    return;
  end if;

  insert into public.shipments
    (reference, tracking_number, client_name, shipper, consignee, origin, destination,
     mode, status, etd, eta, cargo_type, vessel, carrier, po_number, weight_kg, volume_cbm,
     incoterms, current_location, current_lat, current_lng, progress, created_by,
     client_id, carrier_id)
  values
    ('SHP-2026-8801', 'TRK-ROAD-99812', 'Jollibee Foods Logistics', 'Davao Agri Exports Co.',
     'Manila North Harbor Whse', 'Davao Port (PHDVO)', 'Manila Port (PHMNL)',
     'Road', 'In Transit', '2026-07-28', '2026-08-02', 'LCL Truckload', 'Fleet PH-NLEX',
     '2GO Express', 'PO-MNL-99420', 8200, 28.5, 'DAP', 'NLEX Exit 15', 14.735, 120.955, 62,
     v_admin, v_client, v_carrier)
  returning id into v_ship;

  insert into public.shipment_tracking_logs (shipment_id, event_type, level, message, location, lat, lng, created_by)
  values (v_ship, 'gps', 'info', 'Convoy cleared NLEX southbound', 'NLEX Exit 15', 14.735, 120.955, v_admin);

  insert into public.containers
    (reference, container_type, load_type, max_volume_cbm, max_weight_kg, current_volume_cbm,
     current_weight_kg, origin, destination, vessel, status, created_by)
  values
    ('CONT-40HQ-1029', '40ft High Cube Container', 'FCL', 76.2, 28600, 58.4, 21800,
     'Manila Port (PHMNL)', 'Cebu Port (PHCEB)', 'MV SuperCat Visayas',
     'Loading in Progress', v_admin)
  returning id into v_cont;

  insert into public.container_shipments (container_id, shipment_id) values (v_cont, v_ship);

  insert into public.purchase_orders (po_number, client_name, vendor, currency, total_amount, status, shipment_id, created_by)
  values ('PO-MNL-99420', 'Jollibee Foods Logistics', 'Davao Agri Exports Co.', 'PHP', 1245000, 'In Transit', v_ship, v_admin)
  returning id into v_po;

  insert into public.purchase_order_items (po_id, sku, name, qty_ordered, qty_shipped, unit_price)
  values
    (v_po, 'BEV-CRT24', 'Beverage crates (24-pack)', 5000, 5000, 180.00),
    (v_po, 'DRY-SKU12', 'Dry goods tote bins', 2000, 1200, 95.00);

  raise notice 'Demo seed complete: admin@/carrier@/client@demo.local, password DemoPass!123';
end $$;
