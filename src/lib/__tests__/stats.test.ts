import { describe, it, expect } from "vitest";
import { computeStats, monthlyVolume } from "@/lib/stats";
import type { Shipment } from "@/types";

type Row = Pick<Shipment, "status" | "weight_kg">;

describe("computeStats", () => {
  const rows: Row[] = [
    { status: "In Transit", weight_kg: 100 },
    { status: "Delivered", weight_kg: 50 },
    { status: "Cancelled", weight_kg: 25 },
    { status: "Customs Hold", weight_kg: 10 },
  ];

  it("rolls up KPI counts from a shipment set", () => {
    const stats = computeStats(rows);
    expect(stats.active).toBe(2); // In Transit + Customs Hold
    expect(stats.inTransit).toBe(1);
    expect(stats.customsHold).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.delayed).toBe(0);
  });

  it("totals weight with null-safe arithmetic", () => {
    const stats = computeStats([
      { status: "Booked", weight_kg: null as unknown as number },
    ]);
    expect(stats.totalWeightKg).toBe(0);
  });
});

describe("monthlyVolume", () => {
  const monthKey = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  it("returns empty for no shipments", () => {
    expect(monthlyVolume([])).toEqual([]);
  });

  it("groups counts per transport mode per month", () => {
    const out = monthlyVolume([
      { mode: "Road", created_at: "2026-07-15T12:00:00.000Z" },
      { mode: "Air", created_at: "2026-07-16T12:00:00.000Z" },
      { mode: "Road", created_at: "2026-07-17T12:00:00.000Z" },
      { mode: "Ocean", created_at: "2026-08-02T12:00:00.000Z" },
    ]);
    expect(out).toEqual([
      { month: monthKey(new Date("2026-07-15T12:00:00.000Z")), Ocean: 0, Air: 1, Road: 2, Rail: 0 },
      { month: monthKey(new Date("2026-08-02T12:00:00.000Z")), Ocean: 1, Air: 0, Road: 0, Rail: 0 },
    ]);
  });

  it("keeps the NEWEST 7 buckets when more than 7 months are present", () => {
    const shipments = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(2026, 5 - i, 15, 12); // Jun'26 back to Aug'25
      return { mode: "Road" as const, created_at: d.toISOString() };
    });
    const months = monthlyVolume(shipments).map((b) => b.month);
    expect(months).toHaveLength(7);
    expect(months[0]).toBe(monthKey(new Date(2026, 5, 15, 12))); // newest first
    expect(months[6]).toBe(monthKey(new Date(2025, 11, 15, 12))); // 7th newest
    expect(months).not.toContain(monthKey(new Date(2025, 10, 15, 12))); // oldest excluded
  });
});