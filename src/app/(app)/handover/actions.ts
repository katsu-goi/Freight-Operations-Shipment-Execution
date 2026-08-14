"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, canFinalizeHandover } from "@/lib/auth";
import { runAction, ok, fail, type ActionResult } from "@/lib/actions/result";
import { handoverSchema } from "@/lib/validation/schemas";
import { serverLog } from "@/lib/server/log";

/**
 * Finalize handover: a Rider signs for a Ready batch, parcels flip to
 * "Handed Over" and a handover record is written for history/audit.
 */
export async function signHandover(
  input: unknown,
): Promise<ActionResult<{ batchId: string }>> {
  return runAction("handover.signHandover", handoverSchema, input, async (form) => {
    const profile = await requireRole(["Admin", "Dispatcher", "Planner", "Carrier"]);
    if (!canFinalizeHandover(profile.role)) {
      return fail("Only staff may finalize a handover");
    }
    const supabase = await createClient();

    const { data: batch, error: batchError } = await supabase
      .from("carrier_batches")
      .select("id, reference, platform, parcel_count, status")
      .eq("id", form.batchId)
      .maybeSingle();
    if (batchError) return fail(batchError.message);
    if (!batch) return fail("Batch not found");
    if (batch.status !== "Ready") {
      return fail("Only Ready manifests can be handed over");
    }

    const { error: updateError } = await supabase
      .from("carrier_batches")
      .update({
        status: "Handed Over",
        rider_name: form.riderName,
        rider_phone: form.riderPhone || null,
        handover_notes: form.notes || null,
        handed_over_by: profile.id,
        handed_over_at: new Date().toISOString(),
      })
      .eq("id", batch.id);
    if (updateError) return fail(updateError.message);

    const { data: items } = await supabase
      .from("carrier_batch_items")
      .select("shipment_id")
      .eq("batch_id", batch.id);
    if (items?.length) {
      const { error } = await supabase
        .from("shipments")
        .update({ status: "Handed Over" })
        .in("id", items.map((i) => i.shipment_id));
      if (error) return fail(error.message);
    }

    const { error: handoverError } = await supabase.from("handovers").insert({
      batch_id: batch.id,
      platform: batch.platform,
      rider_name: form.riderName,
      rider_phone: form.riderPhone || null,
      parcel_count: batch.parcel_count,
      notes: form.notes || null,
      handed_over_by: profile.id,
    });
    if (handoverError) return fail(handoverError.message);

    serverLog.info("handover.signHandover", {
      batchId: batch.id,
      reference: batch.reference,
      rider: form.riderName,
    });
    revalidatePath("/handover");
    revalidatePath("/manifest");
    revalidatePath("/dashboard");
    return ok({ batchId: batch.id });
  });
}

export const handoverSchemaGuard = z.object({});
export { firstZodError } from "@/lib/validation/schemas";