"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { LoadType } from "@/types";

export async function createContainer(input: {
  reference: string;
  containerType: string;
  loadType: LoadType;
  maxVolumeCbm: number;
  maxWeightKg: number;
  origin: string;
  destination: string;
  vessel: string;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole(["Admin", "Dispatcher"]);
  const supabase = await createClient();

  const { error } = await supabase.from("containers").insert({
    reference: input.reference,
    container_type: input.containerType,
    load_type: input.loadType,
    max_volume_cbm: input.maxVolumeCbm,
    max_weight_kg: input.maxWeightKg,
    current_volume_cbm: 0,
    current_weight_kg: 0,
    origin: input.origin,
    destination: input.destination,
    vessel: input.vessel,
    status: "Planned",
    created_by: profile.id,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/consolidation");
  return { ok: true };
}

/** Consolidate a shipment into a container and roll up utilization. */
export async function assignShipment(
  containerId: string,
  shipmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole(["Admin", "Dispatcher"]);
  const supabase = await createClient();

  // A shipment may only live in one container — reject double allocation.
  const { data: existing } = await supabase
    .from("container_shipments")
    .select("container_id")
    .eq("shipment_id", shipmentId)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Shipment is already consolidated into a container" };
  }

  const { data: shipment } = await supabase
    .from("shipments")
    .select("weight_kg, volume_cbm")
    .eq("id", shipmentId)
    .single();
  if (!shipment) return { ok: false, error: "Shipment not found" };

  const { data: container } = await supabase
    .from("containers")
    .select(
      "current_weight_kg, current_volume_cbm, max_weight_kg, max_volume_cbm",
    )
    .eq("id", containerId)
    .single();
  if (!container) return { ok: false, error: "Container not found" };

  const nextWeight = Number(container.current_weight_kg) + Number(shipment.weight_kg);
  const nextVolume = Number(container.current_volume_cbm) + Number(shipment.volume_cbm);
  if (nextWeight > Number(container.max_weight_kg)) {
    return { ok: false, error: "Shipment would exceed container weight capacity" };
  }
  if (nextVolume > Number(container.max_volume_cbm)) {
    return { ok: false, error: "Shipment would exceed container volume capacity" };
  }

  const { error: linkError } = await supabase
    .from("container_shipments")
    .insert({ container_id: containerId, shipment_id: shipmentId });
  if (linkError) return { ok: false, error: linkError.message };

  await supabase
    .from("containers")
    .update({
      current_weight_kg: nextWeight,
      current_volume_cbm: nextVolume,
      status: "Loading in Progress",
    })
    .eq("id", containerId);

  revalidatePath("/consolidation");
  return { ok: true };
}
