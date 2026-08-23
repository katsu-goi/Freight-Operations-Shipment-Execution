-- =============================================================================
-- Demo seed — consolidated role model (Admin / Seller / Customer / Carrier).
-- Applies automatically on `supabase db reset` (local) or run in SQL Editor.
-- Creates demo auth users with working passwords and provisions profiles.
-- =============================================================================

do $$
declare
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

  if not exists (select 1 from auth.users where email = 'customer@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'customer@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Customer","full_name":"Reyes, Miguel A."}',
       now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'seller@freightos.demo') then
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'seller@freightos.demo', v_pass, now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}',
       '{"role":"Seller","full_name":"Amora, Daniella Sophia P."}',
       now(), now());
  end if;

  -- ---- provision profiles (the signup trigger demotes self-claimed roles,
  --      so demo roles are set explicitly here for development purposes) ----

  insert into public.profiles (id, full_name, email, role, org_name)
  select id, 'Sol, Emmanuel M.', email, 'Admin', 'Airship Express Ops'
    from auth.users where email = 'admin@freightos.demo'
  on conflict (id) do update set role = 'Admin', full_name = 'Sol, Emmanuel M.';

  insert into public.profiles (id, full_name, email, role, org_name)
  select id, 'Reyes, Miguel A.', email, 'Customer', null
    from auth.users where email = 'customer@freightos.demo'
  on conflict (id) do update set role = 'Customer', full_name = 'Reyes, Miguel A.';

  -- Seller demo account is linked to a sellers business record.
  insert into public.sellers (reference, name, email, pickup_frequency)
  values ('SELL-DEMO-0001', 'Amora, Daniella Sophia P.', 'seller@freightos.demo', 'Daily')
  on conflict (reference) do nothing;

  insert into public.profiles (id, full_name, email, role, seller_id)
  select u.id, 'Amora, Daniella Sophia P.', u.email, 'Seller',
         (select s.id from public.sellers s where s.reference = 'SELL-DEMO-0001')
    from auth.users u where u.email = 'seller@freightos.demo'
  on conflict (id) do update set
    role = 'Seller',
    full_name = 'Amora, Daniella Sophia P.',
    seller_id = (select s.id from public.sellers s where s.reference = 'SELL-DEMO-0001');

  raise notice 'Demo seed complete: {admin,seller,customer,carrier}@freightos.demo, shared password demo123456';
end $$;
