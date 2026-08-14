import { describe, it, expect } from "vitest";
import { computeHubStats, monthlyIntakeVolume } from "@/lib/stats";
import { DELIVERY_PLATFORMS } from "@/lib/utils";
import type { Shipment } from "@/types";

type Parcel = Pick<Shipment, "status" | "weight_kg">;

describe("computeHubStats", () => {
  const rows: Parcel[] = [
    { status: "Intake", weight_kg: 100 },
    { status: "Batched", weight_kg: 50 },
    { status: "Handed Over", weight_kg: 25 },
    { status: "Cancelled", weight_kg: 10 },
    { status: "Archived", weight_kg: 5 },
  ];

  it("rolls up hub KPI counts from a parcel set", () => {
    const stats = computeHubStats(rows);
    expect(stats.activeParcels).toBe(2); // Intake + Batched
    expect(stats.intaken).toBe(1);
    expect(stats.batched).toBe(1);
    expect(stats.pendingHandovers).toBe(1);
    expect(stats.handedOver).toBe(1);
    expect(stats.completedDispatches).toBe(1);
    expect(stats.cancelled).toBe(1);
  });

  it("totals weight excluding cancelled/archived parcels", () => {
    const stats = computeHubStats(rows);
    expect(stats.totalWeightKg).toBe(175); // 100 + 50 + 25
  });

  it("treats null weight-safe", () => {
    const stats = computeHubStats([
      { status: "Intake", weight_kg: null as unknown as number },
    ]);
    expect(stats.totalWeightKg).toBe(0);
  });
});

describe("monthlyIntakeVolume", () => {
  const monthKey = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  it("returns empty for no parcels", () => {
    expect(monthlyIntakeVolume([])).toEqual([]);
  });

  it("groups per platform per month", () => {
    const out = monthlyIntakeVolume([
      { platform: "J&T Express", created_at: "2026-07-15T12:00:00.000Z" },
      { platform: "Flash Express", created_at: "2026-07-16T12:00:00.000Z" },
      { platform: "J&T Express", created_at: "2026-07-17T12:00:00.000Z" },
      { platform: "LBC Express", created_at: "2026-08-02T12:00:00.000Z" },
    ]);
    const row = out[0];
    expect(row.month).toBe(monthKey(new Date("2026-07-15T12:00:00.000Z")));
    expect(row["J&T Express"]).toBe(2);
    expect(row["Flash Express"]).toBe(1);
    expect(out[1]["LBC Express"]).toBe(1);
    for (const p of DELIVERY_PLATFORMS) {
      expect(typeof row[p]).toBe("number");
    }
  });

  it("keeps the newest buckets when more than 7 months are present", () => {
    const parcels = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(2026, 5 - i, 15, 12); // Jun'26 back to Aug'25
      return { platform: "J&T Express" as const, created_at: d.toISOString() };
    });
    const months = monthlyIntakeVolume(parcels).map((b) => b.month);
    expect(months).toHaveLength(7);
    expect(months[0]).toBe(monthKey(new Date(2026, 5, 15, 12))); // newest first
  });
});