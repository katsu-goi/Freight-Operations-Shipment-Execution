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
  v_batch    uuid;
  v_pass     text := crypt('demo123456', gen_salt('bf'));
begin
  -- ---- demo users (idempotent: skip if already registered). Emails and names
  --      match the one-click Quick Login accounts on the sign-in page. ----
  if not exists (select 1 from auth.users where email = 'admin@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'admin@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Admin","full_name":"Sol, Emmanuel M."}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'dispatcher@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'dispatcher@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Dispatcher","full_name":"Munoz, Arnold M."}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'planner@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'planner@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Planner","full_name":"Pace, Emmanuel Jason D."}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'carrier@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'carrier@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Carrier","full_name":"Sogale, Christian Jericho C."}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'client@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'client@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Client","full_name":"Amora, Daniella Sophia P."}',
       now(), now());
  end if;

  -- ---- provision profiles (trigger demotes sign-up roles, so staff demos
  --      are elevated explicitly here for development/demo purposes) ----
  select id into v_admin from auth.users where email = 'admin@freightos.demo';
  insert into public.profiles (id, full_name, email, role, org_name)
  values (v_admin, 'Sol, Emmanuel M.', 'admin@freightos.demo', 'Admin', 'Airship Express Ops')
  on conflict (id) do update set role = 'Admin', full_name = 'Sol, Emmanuel M.';

  select id into v_carrier from auth.users where email = 'carrier@freightos.demo';
  insert into public.profiles (id, full_name, email, role, org_name)
  values (v_carrier, 'Sogale, Christian Jericho C.', 'carrier@freightos.demo', 'Carrier', 'Demo Trucking Co.')
  on conflict (id) do update set role = 'Carrier', full_name = 'Sogale, Christian Jericho C.';

  select id into v_client from auth.users where email = 'client@freightos.demo';
  insert into public.profiles (id, full_name, email, role, org_name)
  values (v_client, 'Amora, Daniella Sophia P.', 'client@freightos.demo', 'Client', 'Jollibee Foods Logistics')
  on conflict (id) do update set role = 'Client', full_name = 'Amora, Daniella Sophia P.';

  insert into public.profiles (id, full_name, email, role, org_name)
  select id, 'Munoz, Arnold M.', 'dispatcher@freightos.demo', 'Dispatcher', 'Airship Express Ops'
    from auth.users where email = 'dispatcher@freightos.demo'
  on conflict (id) do update set role = 'Dispatcher', full_name = 'Munoz, Arnold M.';

  insert into public.profiles (id, full_name, email, role, org_name)
  select id, 'Pace, Emmanuel Jason D.', 'planner@freightos.demo', 'Planner', 'Airship Express Ops'
    from auth.users where email = 'planner@freightos.demo'
  on conflict (id) do update set role = 'Planner', full_name = 'Pace, Emmanuel Jason D.';

  -- ---- sample data (skip when already loaded) ----
  if exists (select 1 from public.shipments) then
    raise notice 'Demo parcels already present; skipping data seeding.';
    return;
  end if;

  -- sellers
  insert into public.sellers
    (reference, name, contact_person, phone, email, address, pickup_frequency, created_by)
  values
    ('SEL-2026-001', 'Jollibee Foods Logistics', 'M. Tan', '0917-000-0101', 'logistics@jollibeefoods.demo', 'Pasig City', 'Daily', v_admin),
    ('SEL-2026-002', 'Lazada Seller Hub Manila', 'R. Cruz', '0917-000-0202', 'hub.manila@sellerlazada.demo', 'Manila CBD', 'On-demand', v_admin),
    ('SEL-2026-003', 'Shopee Sellers Quezon City', 'K. Reyes', '0917-000-0303', 'qc.shopee.sellers@demo.ph', 'Quezon City', '2x per week', v_admin);

  insert into public.shipments
    (reference, tracking_number, client_name, consignee, origin, destination,
     platform, status, service_type, weight_kg, cod_amount, current_location,
     progress, created_by, seller_id)
  values
    ('SHP-2026-8801', 'TRK-HUB-99812', 'Jollibee Foods Logistics', 'J. Dela Cruz', 'Branch Hub', 'Quezon City',
     'J&T Express', 'Intake', 'Standard', 12.5, 0, 'Branch Hub', 10, v_admin,
     (select id from public.sellers where reference = 'SEL-2026-001')),
    ('SHP-2026-8802', 'TRK-HUB-99813', 'Jollibee Foods Logistics', 'A. Santos', 'Branch Hub', 'Manila CBD',
     'J&T Express', 'Intake', 'COD', 4.2, 1250, 'Branch Hub', 10, v_admin,
     (select id from public.sellers where reference = 'SEL-2026-001')),
    ('SHP-2026-8803', 'TRK-HUB-99814', 'Lazada Seller Hub Manila', 'M. Garcia', 'Branch Hub', 'Cainta',
     'Flash Express', 'Intake', 'Standard', 8.0, 0, 'Branch Hub', 10, v_admin,
     (select id from public.sellers where reference = 'SEL-2026-002')),
    ('SHP-2026-8804', 'TRK-HUB-99815', 'Shopee Sellers Quezon City', 'L. Ramos', 'Branch Hub', 'Pasig',
     'Shopee Drop-Off', 'Intake', 'Next-Day', 2.1, 890, 'Branch Hub', 10, v_admin,
     (select id from public.sellers where reference = 'SEL-2026-003'))
  returning id into v_ship;

  insert into public.shipment_tracking_logs (shipment_id, event_type, level, message, location, created_by)
  values (v_ship, 'intake', 'success', 'Parcel intaken at Branch Hub', 'Branch Hub', v_admin);

  -- one manifest mid-lifecycle: Batch A (J&T) is Draft
  insert into public.carrier_batches
    (reference, platform, status, parcel_count, total_weight_kg, created_by)
  values ('MNF-2026-1001', 'J&T Express', 'Draft', 3, 24.7, v_admin)
  returning id into v_batch;

  insert into public.carrier_batch_items (batch_id, shipment_id, sequence_no)
  select v_batch, id, row_number() over (order by reference)
    from public.shipments where platform = 'J&T Express';

  -- one manifest already handed over to a rider
  insert into public.carrier_batches
    (reference, platform, status, parcel_count, total_weight_kg, rider_name,
     rider_phone, handover_notes, handed_over_by, handed_over_at, created_by)
  values ('MNF-2026-1000', 'Flash Express', 'Handed Over', 2, 9.5, 'Banjo Rider',
          '0917-000-0999', 'Signed off at counter', v_admin, now() - interval '4 hours', v_admin)
  returning id into v_batch;

  insert into public.handovers
    (batch_id, platform, rider_name, rider_phone, parcel_count, notes, handed_over_by, handed_over_at)
  values (v_batch, 'Flash Express', 'Banjo Rider', '0917-000-0999', 2, 'Signed off at counter', v_admin,
          now() - interval '4 hours');

  raise notice 'Demo seed complete: {admin,dispatcher,planner,carrier,client}@freightos.demo, shared password demo123456';
end $$;
