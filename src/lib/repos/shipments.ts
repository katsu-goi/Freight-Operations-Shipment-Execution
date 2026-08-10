import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Shipment } from "@/types";

export interface ShipmentQuery {
  q?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * Paginated, searchable shipment listing. RLS-scoped to the caller.
 * Memoized per request via React `cache()` so parallel RSC reads are deduped.
 */
export const listShipments = cache(
  async (opts: ShipmentQuery = {}): Promise<Paged<Shipment>> => {
    const supabase = await createClient();
    const page = Math.max(1, opts.page ?? 1);
    const perPage = Math.min(100, Math.max(1, opts.perPage ?? 25));
    const from = (page - 1) * perPage;

    let query = supabase.from("shipments").select("*", { count: "exact" });
    if (opts.status) query = query.eq("status", opts.status as Shipment["status"]);
    if (opts.q && opts.q.trim()) {
      const q = opts.q.trim();
      query = query.or(
        `reference.ilike.%${q}%,tracking_number.ilike.%${q}%,client_name.ilike.%${q}%,po_number.ilike.%${q}%`,
      );
    }
    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);

    return { rows: (data ?? []) as Shipment[], total: count ?? 0, page, perPage };
  },
);

/** Unbounded-ish recent set for the dashboard KPI/chart roll-ups. */
export const listRecentShipments = cache(
  async (limit = 200): Promise<Shipment[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Shipment[];
  },
);

/** Shipment slice used by the BoL generator (no heavy columns). */
export const listShipmentsForBol = cache(
  async (): Promise<
    Pick<
      Shipment,
      | "id"
      | "reference"
      | "shipper"
      | "consignee"
      | "vessel"
      | "origin"
      | "destination"
      | "container_no"
      | "weight_kg"
      | "volume_cbm"
    >[]
  > => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shipments")
      .select(
        "id, reference, shipper, consignee, vessel, origin, destination, container_no, weight_kg, volume_cbm",
      )
      .order("created_at", { ascending: false });
    return data ?? [];
  },
);

export const getShipmentById = cache(async (id: string): Promise<Shipment | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("shipments").select("*").eq("id", id).maybeSingle();
  return (data as Shipment) ?? null;
});