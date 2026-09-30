import type { Shipment } from "@/types";

export interface AnalyticsSummary {
  total: number;
  delivered: number;
  inTransit: number;
  failed: number;
  deliveryRate: number;
  totalWeightKg: number;
  totalCod: number;
  avgWeightKg: number;
  platformShare: { platform: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  weightTrend: { month: string; kg: number }[];
}

/**
 * Data-analytics roll-ups computed server-side from the RLS-visible parcel set.
 * Pure function — unit-testable without Supabase.
 */
export function computeAnalytics(parcels: Shipment[]): AnalyticsSummary {
  const total = parcels.length;
  const delivered = parcels.filter((p) => p.status === "Delivered").length;
  const inTransit = parcels.filter((p) =>
    ["In Transit", "Out for Delivery", "At Destination Hub"].includes(p.status),
  ).length;
  const failed = parcels.filter((p) =>
    ["Delivery Failed", "Returned", "Cancelled"].includes(p.status),
  ).length;

  const totalWeightKg = parcels.reduce(
    (a, p) => a + Number(p.weight_kg ?? 0),
    0,
  );
  const totalCod = parcels.reduce((a, p) => a + Number(p.cod_amount ?? 0), 0);

  const byPlatform = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const p of parcels) {
    byPlatform.set(p.platform, (byPlatform.get(p.platform) ?? 0) + 1);
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    const d = new Date(p.created_at);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(p.weight_kg ?? 0));
  }

  return {
    total,
    delivered,
    inTransit,
    failed,
    deliveryRate: total ? Math.round((delivered / total) * 1000) / 10 : 0,
    totalWeightKg: Math.round(totalWeightKg * 10) / 10,
    totalCod: Math.round(totalCod * 100) / 100,
    avgWeightKg:
      total > 0 ? Math.round((totalWeightKg / total) * 100) / 100 : 0,
    platformShare: [...byPlatform.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count),
    statusBreakdown: [...byStatus.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    weightTrend: [...byMonth.entries()]
      .slice(-7)
      .map(([month, kg]) => ({ month, kg: Math.round(kg * 10) / 10 })),
  };
}
