-- =============================================================================
-- Remove vessel & port-of-call fields. The operating model is now the simpler
-- Branch Hub → Handover to J&T flow, so ocean/port metadata is no longer used.
-- Idempotent for live DBs.
-- =============================================================================

alter table public.shipments
  drop column if exists vessel;

alter table public.containers
  drop column if exists vessel;

alter table public.bills_of_lading
  drop column if exists vessel_name,
  drop column if exists voyage_no,
  drop column if exists port_of_loading,
  drop column if exists port_of_discharge,
  drop column if exists place_of_delivery;
