-- =============================================================================
-- Add SuperAdmin + Citizen roles to app_role enum (split from
-- 20260922_core_requirements).
--
-- PostgreSQL forbids using a newly added enum value before the ALTER TYPE
-- commits (SQLSTATE 55P04), and `supabase db push` runs each migration file
-- in a single transaction. So the values must be added in this EARLIER,
-- committed migration; 20260922 then only *uses* them.
-- Isolated so RBAC helpers run in correct sequence:
-- 20260918_fix_notify_row_arg -> 20260919_add_superadmin_citizen_enum
--   -> 20260922_core_requirements.
-- Idempotent via IF NOT EXISTS so re-runs are safe.
-- =============================================================================

alter type public.app_role add value if not exists 'SuperAdmin';
alter type public.app_role add value if not exists 'Citizen';
