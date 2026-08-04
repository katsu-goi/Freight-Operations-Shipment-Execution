import type { Database, TransportMode } from "./database";

/** Convenience row aliases used across the UI. */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];
export type TrackingLog =
  Database["public"]["Tables"]["shipment_tracking_logs"]["Row"];
export type Container = Database["public"]["Tables"]["containers"]["Row"];
export type BillOfLading =
  Database["public"]["Tables"]["bills_of_lading"]["Row"];
export type PurchaseOrder =
  Database["public"]["Tables"]["purchase_orders"]["Row"];
export type PurchaseOrderItem =
  Database["public"]["Tables"]["purchase_order_items"]["Row"];

export type {
  AppRole,
  TransportMode,
  ShipmentStatus,
  ContainerStatus,
  BolType,
  PoStatus,
  LoadType,
} from "./database";

/** Container joined with the shipments consolidated into it. */
export interface ContainerWithShipments extends Container {
  shipments: Pick<
    Shipment,
    "id" | "reference" | "weight_kg" | "volume_cbm" | "cargo_type"
  >[];
}

/** Purchase order joined with its line items. */
export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

/** Dashboard KPI roll-up. */
export interface ShipmentStats {
  active: number;
  inTransit: number;
  customsHold: number;
  delivered: number;
  delayed: number;
  totalWeightKg: number;
}

/** ----- AI feature contracts ----- */

/** One carrier/route recommendation returned by the routing engine. */
export interface RouteRecommendation {
  routeName: string;
  carrierName: string;
  transitTimeDays: number;
  estimatedCostUSD: number;
  co2ReductionPercent: number;
  riskScore: "Low" | "Medium" | "High";
  keyAdvantage: string;
}

/** Structured Bill of Lading fields parsed from free text. */
export interface ParsedBillOfLading {
  billOfLadingNumber: string;
  shipperName: string;
  consigneeName: string;
  vesselName: string;
  voyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  containerNumber: string;
  totalWeightKg: number;
  totalVolumeCbm: number;
  goodsDescription: string;
}

export interface RoutingRequest {
  origin: string;
  destination: string;
  mode: TransportMode;
  weightKg: number;
  volumeCbm: number;
  incoterms: string;
}

