-- =============================================================================
-- Add Seller role to app_role enum (split from 20260823_parcel_platform).
-- Isolated so Customer + parcel platform ops run in correct sequence:
-- 20260822_add_seller_enum -> 20260823_parcel_platform.
-- Idempotent via IF NOT EXISTS so re-runs are safe.
-- =============================================================================

alter type public.app_role add value if not exists 'Seller';
alter type public.app_role add value if not exists 'Customer';
