import { createClient } from "@/lib/supabase/server";
import type { Shipment, ShipmentStats } from "@/types";

/** Compute dashboard KPI roll-up from a shipment set. */
export function computeStats(shipments: Pick<Shipment, "status" | "weight_kg">[]): ShipmentStats {
  return {
    active: shipments.filter((s) => s.status !== "Delivered" && s.status !== "Cancelled").length,
    inTransit: shipments.filter((s) => s.status === "In Transit").length,
    customsHold: shipments.filter((s) => s.status === "Customs Hold").length,
    delivered: shipments.filter((s) => s.status === "Delivered").length,
    delayed: shipments.filter((s) => s.status === "Delayed").length,
    totalWeightKg: shipments.reduce((acc, s) => acc + Number(s.weight_kg ?? 0), 0),
  };
}

const MODES = ["Ocean", "Air", "Road", "Rail"] as const;

/** Monthly multimodal volume (count of shipments per mode per month). */
export function monthlyVolume(
  shipments: Pick<Shipment, "mode" | "created_at">[],
): { month: string; Ocean: number; Air: number; Road: number; Rail: number }[] {
  const buckets = new Map<string, Record<string, number>>();
  for (const s of shipments) {
    const d = new Date(s.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const bucket = buckets.get(key) ?? { Ocean: 0, Air: 0, Road: 0, Rail: 0 };
    bucket[s.mode] = (bucket[s.mode] ?? 0) + 1;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .slice(-7)
    .map(([month, v]) => ({
      month,
      Ocean: v.Ocean ?? 0,
      Air: v.Air ?? 0,
      Road: v.Road ?? 0,
      Rail: v.Rail ?? 0,
    }));
}

/** Fetch all shipments visible to the current user (RLS-scoped). */
export async function getShipments(): Promise<Shipment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export { MODES };
