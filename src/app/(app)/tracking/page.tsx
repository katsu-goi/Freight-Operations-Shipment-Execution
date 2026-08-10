import { requireProfile } from "@/lib/auth";
import { listShipments } from "@/lib/repos/shipments";
import { listTrackingLogs } from "@/lib/repos/loadplans";
import PageHeader from "@/components/ui/PageHeader";
import TrackingClient from "./TrackingClient";
import type { Shipment } from "@/types";

export const dynamic = "force-dynamic";

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ shipment?: string; q?: string }>;
}) {
  const profile = await requireProfile();
  const { shipment: shipmentId, q } = await searchParams;

  const { rows } = await listShipments({ q: q ?? undefined, perPage: 500 });
  const list = rows as Shipment[];

  const initial = shipmentId ? list.find((s) => s.id === shipmentId) ?? null : list[0] ?? null;

  let initialLogs: Awaited<ReturnType<typeof listTrackingLogs>> = [];
  if (initial) {
    initialLogs = await listTrackingLogs(initial.id);
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
