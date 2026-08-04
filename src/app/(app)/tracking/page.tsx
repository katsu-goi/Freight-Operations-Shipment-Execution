import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import TrackingClient from "./TrackingClient";
import type { Shipment, TrackingLog } from "@/types";

export const dynamic = "force-dynamic";

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ shipment?: string; q?: string }>;
}) {
  const profile = await requireProfile();
  const { shipment: shipmentId, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("shipments").select("*").order("created_at", { ascending: false });
  if (q) {
    query = query.or(
      `reference.ilike.%${q}%,tracking_number.ilike.%${q}%,client_name.ilike.%${q}%,po_number.ilike.%${q}%`,
    );
  }
  const { data: shipments } = await query;
  const list = (shipments ?? []) as Shipment[];

  const initial = shipmentId ? list.find((s) => s.id === shipmentId) ?? null : list[0] ?? null;

  let initialLogs: TrackingLog[] = [];
  if (initial) {
    const { data } = await supabase
      .from("shipment_tracking_logs")
      .select("*")
      .eq("shipment_id", initial.id)
      .order("created_at", { ascending: false })
      .limit(40);
    initialLogs = (data ?? []) as TrackingLog[];
  }

  const canPost = profile.role !== "Client";

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Shipment File & Live Tracking"
        title="Live Shipment Tracking"
        description="Interactive map, status timeline, and realtime location updates via Supabase Realtime."
      />
      <TrackingClient
        shipments={list}
        initialShipment={initial}
        initialLogs={initialLogs}
        canPost={canPost}
      />
    </div>
  );
}
