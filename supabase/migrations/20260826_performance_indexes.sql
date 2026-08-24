-- =============================================================================
-- Performance pass: composite indexes for the hottest parcel-platform queries.
-- All additive / IF NOT EXISTS — idempotent for live DBs.
-- =============================================================================

-- Seller dashboards: "my parcels" filtered by status chips.
create index if not exists shipments_seller_status_created_idx
  on public.shipments (seller_id, status, created_at desc);

-- Customer dashboard: assigned parcels newest-first.
create index if not exists shipments_client_created_idx2
  on public.shipments (client_id, created_at desc);

-- Tracking timeline: events for one parcel in chronological order.
create index if not exists tracking_logs_shipment_time_idx
  on public.shipment_tracking_logs (shipment_id, created_at);

-- Notification bell: unread count per user is a hot query on every page load.
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where not is_read;

-- Hub directory: active facilities first.
create index if not exists sellers_active_name_idx
  on public.sellers (is_active, name);

analyze public.shipments;
analyze public.shipment_tracking_logs;
analyze public.notifications;
