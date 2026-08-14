import type { Shipment, HubStats } from "@/types";
import { DELIVERY_PLATFORMS } from "@/lib/utils";

/**
 * Compute hub dashboard KPIs from a parcel set.
 *
 * Lifecycle: Intake → Batched → Handed Over (terminal). Cancelled/Archived
 * are the soft-exit states and never count as active parcels.
 */
export function computeHubStats(
  parcels: Pick<Shipment, "status" | "weight_kg">[],
): HubStats {
  const active = parcels.filter(
    (p) => p.status !== "Handed Over" && p.status !== "Cancelled" && p.status !== "Archived",
  ).length;
  return {
    activeParcels: active,
    intakeToday: parcels.filter((p) => p.status === "Intake").length,
    pendingHandovers: parcels.filter((p) => p.status === "Batched").length,
    completedDispatches: parcels.filter((p) => p.status === "Handed Over").length,
    intaken: parcels.filter((p) => p.status === "Intake").length,
    batched: parcels.filter((p) => p.status === "Batched").length,
    handedOver: parcels.filter((p) => p.status === "Handed Over").length,
    cancelled: parcels.filter((p) => p.status === "Cancelled").length,
    totalWeightKg: parcels.reduce(
      (acc, p) =>
        acc +
        (p.status !== "Cancelled" && p.status !== "Archived"
          ? Number(p.weight_kg ?? 0)
          : 0),
      0,
    ),
  };
}

export type IntakeRow = {
  month: string;
  [platform: string]: string | number;
};

/**
 * Monthly parcels-per-platform counts for the dashboard chart.
 * Data arrives newest-first; the newest 7 month buckets are kept.
 */
export function monthlyIntakeVolume(
  parcels: Pick<Shipment, "platform" | "created_at">[],
): IntakeRow[] {
  const buckets = new Map<string, Record<string, number>>();
  for (const p of parcels) {
    const d = new Date(p.created_at);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const bucket = buckets.get(key) ?? Object.fromEntries(DELIVERY_PLATFORMS.map((pl) => [pl, 0]));
    bucket[p.platform] = (bucket[p.platform] ?? 0) + 1;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .slice(0, 7)
    .map(([month, v]) => ({ month, ...v }));
}