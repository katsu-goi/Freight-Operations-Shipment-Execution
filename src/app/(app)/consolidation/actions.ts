"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { runAction, fail, type ActionResult } from "@/lib/actions/result";
import {
  containerSchema,
  containerAssignSchema,
  type ContainerInput,
} from "@/lib/validation/schemas";

export type { ContainerInput };

export async function createContainer(input: ContainerInput): Promise<ActionResult> {
  return runAction("consolidation.createContainer", containerSchema, input, async (form) => {
    const profile = await requireRole(["Admin", "Dispatcher"]);
    const supabase = await createClient();

    const { error } = await supabase.from("containers").insert({
      reference: form.reference,
      container_type: form.containerType,
      load_type: form.loadType,
      max_volume_cbm: form.maxVolumeCbm,
      max_weight_kg: form.maxWeightKg,
      current_volume_cbm: 0,
      current_weight_kg: 0,
      origin: form.origin || null,
      destination: form.destination || null,
      vessel: form.vessel || null,
      status: "Planned",
      created_by: profile.id,
    });

    if (error) return fail(error.message);
    revalidatePath("/consolidation");
    return { ok: true };
  });
}

/** Consolidate a shipment into a container and roll up utilization. */
export async function assignShipment(
  containerId: string,
  shipmentId: string,
): Promise<ActionResult> {
  return runAction(
    "consolidation.assignShipment",
    containerAssignSchema,
    { containerId, shipmentId },
    async (form) => {
      await requireRole(["Admin", "Dispatcher"]);
      const supabase = await createClient();

      // A shipment may only live in one container — reject double allocation.
      const { data: existing } = await supabase
        .from("container_shipments")
        .select("container_id")
        .eq("shipment_id", form.shipmentId)
        .maybeSingle();
      if (existing) {
        return fail("Shipment is already consolidated into a container");
      }

      const { data: shipment } = await supabase
        .from("shipments")
        .select("weight_kg, volume_cbm")
        .eq("id", form.shipmentId)
        .single();
      if (!shipment) return fail("Shipment not found");

      const { data: container } = await supabase
        .from("containers")
        .select("current_weight_kg, current_volume_cbm, max_weight_kg, max_volume_cbm")
        .eq("id", form.containerId)
        .single();
      if (!container) return fail("Container not found");

      const nextWeight = Number(container.current_weight_kg) + Number(shipment.weight_kg);
      const nextVolume = Number(container.current_volume_cbm) + Number(shipment.volume_cbm);
      if (nextWeight > Number(container.max_weight_kg)) {
        return fail("Shipment would exceed container weight capacity");
      }
      if (nextVolume > Number(container.max_volume_cbm)) {
        return fail("Shipment would exceed container volume capacity");
      }

      const { error: linkError } = await supabase
        .from("container_shipments")
        .insert({ container_id: form.containerId, shipment_id: form.shipmentId });
      if (linkError) return fail(linkError.message);

      await supabase
        .from("containers")
        .update({
          current_weight_kg: nextWeight,
          current_volume_cbm: nextVolume,
          status: "Loading in Progress",
        })
        .eq("id", form.containerId);

      revalidatePath("/consolidation");
      return { ok: true };
    },
  );
}