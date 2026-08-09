"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canPostTracking } from "@/lib/auth";
import type { ShipmentStatus } from "@/types";

/**
 * Post a live location/status update. The insert and the shipment patch run
 * atomically in the `post_tracking_update` stored function, which also enforces
 * role/ownership and Philippine-bounds checks at the database layer.
 */
export async function postLocationUpdate(input: {
  shipmentId: string;
  message: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  progress?: number | null;
  status?: ShipmentStatus | null;
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  if (!canPostTracking(profile.role)) {
    return { ok: false, error: "Your role cannot post tracking updates" };
  }
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("post_tracking_update", {
    p_shipment_id: input.shipmentId,
    p_message: input.message || `Location updated: ${input.location}`,
    p_location: input.location,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_progress: input.progress ?? null,
    p_status: input.status ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (result.ok === false) {
    return { ok: false, error: result.error ?? "Failed to post tracking update" };
  }

  revalidatePath("/tracking");
  revalidatePath("/dashboard");
  return { ok: true };
}
