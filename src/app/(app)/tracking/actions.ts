"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canPostTracking } from "@/lib/auth";
import { runAction, fail, type ActionResult } from "@/lib/actions/result";
import { trackingUpdateSchema } from "@/lib/validation/schemas";

/**
 * Post a live location/status update. The insert and the shipment patch run
 * atomically in the `post_tracking_update` stored function, which also enforces
 * role/ownership and Philippine-bounds checks at the database layer.
 */
export async function postLocationUpdate(
  input: unknown,
): Promise<ActionResult> {
  return runAction("tracking.postLocationUpdate", trackingUpdateSchema, input, async (form) => {
    const profile = await requireProfile();
    if (!canPostTracking(profile.role)) {
      return { ok: false, error: "Your role cannot post tracking updates" };
    }
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("post_tracking_update", {
      p_shipment_id: form.shipmentId,
      p_message: form.message || `Location updated: ${form.location}`,
      p_location: form.location,
      p_lat: form.lat ?? null,
      p_lng: form.lng ?? null,
      p_progress: form.progress ?? null,
      p_status: form.status ?? null,
    });
    if (error) return fail(error.message);

    const result = (data ?? {}) as { ok?: boolean; error?: string };
    if (result.ok === false) {
      return fail(result.error ?? "Failed to post tracking update");
    }

    revalidatePath("/tracking");
    revalidatePath("/dashboard");
    return { ok: true };
  });
}