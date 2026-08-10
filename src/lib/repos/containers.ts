import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ContainerWithShipments, Container, Shipment } from "@/types";

type ContainerRow = Omit<ContainerWithShipments, "shipments"> & {
  container_shipments?: {
    shipments: Pick<
      Shipment,
      "id" | "reference" | "weight_kg" | "volume_cbm" | "cargo_type"
    > | null;
  }[];
};

/** Containers joined with the shipments consolidated into each. */
export const listContainersWithShipments = cache(
  async (): Promise<ContainerWithShipments[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("containers")
      .select(
        "*, container_shipments(shipments(id, reference, weight_kg, volume_cbm, cargo_type))",
      )
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as unknown as ContainerRow[];
    return rows.map((row) => ({
      ...row,
      shipments: (row.container_shipments ?? [])
        .map((l) => l.shipments)
        .filter(Boolean) as ContainerWithShipments["shipments"],
    }));
  },
);

export const listContainers = cache(async (): Promise<Container[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("containers")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});