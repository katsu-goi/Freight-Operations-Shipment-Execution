import { describe, it, expect } from "vitest";
import { computeAnalytics } from "@/lib/analytics";
import { applyReportFilters, toCsv } from "@/lib/reports";
import { buildFewShotPrefix } from "@/lib/ai-training";
import type { Shipment } from "@/types";

const base = {
  id: "1",
  reference: "REF-1",
  tracking_number: "TRK-1",
  client_name: "Acme",
  shipper: null,
  consignee: "Juan",
  origin: "Manila",
  destination: "Cebu",
  mode: "Road",
  status: "Delivered",
  etd: null,
  eta: null,
  container_no: null,
  cargo_type: null,
  carrier: null,
  po_number: null,
  weight_kg: 10,
  volume_cbm: 1,
  hazard_class: null,
  incoterms: null,
  current_location: null,
  current_lat: null,
  current_lng: null,
  description: null,
  dimensions: null,
  shipping_fee: null,
  recipient_phone: null,
  expected_delivery_date: null,
  current_hub_id: null,
  progress: 100,
  platform: "J&T Express",
  seller_id: null,
  service_type: "Standard",
  cod_amount: 100,
  cancel_reason: null,
  archived_at: null,
  client_id: null,
  carrier_id: null,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as Shipment;

describe("analytics", () => {
  it("computes delivery rate and platform share", () => {
    const rows = [
      base,
      { ...base, id: "2", status: "In Transit", platform: "LBC Express" } as Shipment,
    ];
    const a = computeAnalytics(rows);
    expect(a.total).toBe(2);
    expect(a.delivered).toBe(1);
    expect(a.deliveryRate).toBe(50);
    expect(a.platformShare).toHaveLength(2);
  });
});

describe("reports", () => {
  it("filters by status and search", () => {
    const rows = [
      base,
      { ...base, id: "2", status: "Cancelled", reference: "REF-2" } as Shipment,
    ];
    expect(applyReportFilters(rows, { status: "Delivered" })).toHaveLength(1);
    expect(applyReportFilters(rows, { search: "ref-2" })[0].id).toBe("2");
    const csv = toCsv(rows);
    expect(csv.split("\n")).toHaveLength(3);
    expect(csv).toContain("reference");
  });
});

describe("ai training", () => {
  it("builds a few-shot prefix", () => {
    expect(buildFewShotPrefix([])).toBe("");
    const prefix = buildFewShotPrefix([
      {
        id: "e1",
        kind: "routing",
        input: "Manila to Cebu",
        expected_output: '{"routes":[]}',
        notes: "",
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    expect(prefix).toContain("Manila to Cebu");
  });
});
