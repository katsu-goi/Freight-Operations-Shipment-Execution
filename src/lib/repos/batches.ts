import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  CarrierBatch,
  CarrierBatchWithItems,
  DeliveryPlatform,
  Shipment,
} from "@/types";

const ITEM_SELECT =
  "*, items:carrier_batch_items(sequence_no, shipment:shipments(id, reference, tracking_number, client_name, consignee, destination, weight_kg, cod_amount, service_type, status))";

function shapeBatches(
  rows: Array<{ id: string; [key: string]: unknown }>,
): CarrierBatchWithItems[] {
  return rows.map((row) => {
    const rawItems = (row.items ?? []) as Array<{
      sequence_no: number;
      shipment?: Partial<Shipment> | null;
    }>;
    return {
      ...row,
      items: rawItems.map((it) => ({
        id: it.shipment?.id ?? "",
        reference: it.shipment?.reference ?? "",
        tracking_number: it.shipment?.tracking_number ?? null,
        client_name: it.shipment?.client_name ?? "",
        consignee: it.shipment?.consignee ?? null,
        destination: it.shipment?.destination ?? null,
        weight_kg: it.shipment?.weight_kg ?? 0,
        cod_amount: it.shipment?.cod_amount ?? 0,
        service_type: it.shipment?.service_type ?? "",
        status: (it.shipment?.status ?? "Intake") as Shipment["status"],
      })),
    } as CarrierBatchWithItems;
  });
}

/** Unhanded (Draft/Ready) batches ordered newest first. */
export const listActiveBatches = cache(async (): Promise<CarrierBatch[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("carrier_batches")
    .select("*")
    .not("status", "eq", "Handed Over")
    .order("updated_at", { ascending: false });
  return (data ?? []) as CarrierBatch[];
});

/** Batches for the handover screen that are Ready for rider sign-off. */
export const listReadyBatches = cache(async (): Promise<CarrierBatch[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("carrier_batches")
    .select("*")
    .eq("status", "Ready")
    .order("updated_at", { ascending: false });
  return (data ?? []) as CarrierBatch[];
});

/** Batches carrying full manifest item detail, newest first. */
export const listBatchesWithItems = cache(
  async (limit = 100): Promise<CarrierBatchWithItems[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("carrier_batches")
      .select(ITEM_SELECT)
      .order("updated_at", { ascending: false })
      .limit(limit);
    return shapeBatches((data ?? []) as Array<{ id: string; [key: string]: unknown }>);
  },
);

export const getBatchById = cache(
  async (id: string): Promise<CarrierBatchWithItems | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("carrier_batches")
      .select(ITEM_SELECT)
      .eq("id", id)
      .maybeSingle();
    return (
      shapeBatches([data as { id: string; [key: string]: unknown }])[0] ?? null
    );
  },
);

export function batchLabel(platform: DeliveryPlatform): string {
  return `${platform} Manifest`;
}