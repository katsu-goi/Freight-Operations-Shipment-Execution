import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

type PoRow = Omit<PurchaseOrder, "items"> & {
  purchase_order_items?: PurchaseOrderItem[];
  shipment?: { reference: string; status: string } | null;
};

export type PoWithShipment = PurchaseOrder & {
  items: PurchaseOrderItem[];
  shipment: { reference: string; status: string } | null;
};

/** Purchase orders joined with line items and their linked shipment. */
export const listPurchaseOrdersWithItems = cache(
  async (): Promise<PoWithShipment[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("purchase_orders")
      .select(
        "*, items:purchase_order_items(*), shipment:shipments(reference, status)",
      )
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as PoRow[];
    return rows.map(({ purchase_order_items, shipment, ...po }) => ({
      ...po,
      items: purchase_order_items ?? [],
      shipment: shipment ?? null,
    }));
  },
);