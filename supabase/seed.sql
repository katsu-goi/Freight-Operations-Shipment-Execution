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

  raise notice 'Demo seed complete: {admin,dispatcher,planner,carrier,client}@freightos.demo, shared password demo123456';
end $$;
