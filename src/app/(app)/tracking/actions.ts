"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isStaff } from "@/lib/auth";
import type { ShipmentStatus } from "@/types";
import type { Database } from "@/types/database";

type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

/**
 * Post a live location/status update. Writes a tracking log row (which the
 * realtime feed streams) and rolls the position onto the shipment.
 * Staff can update any shipment; carriers only their assigned loads (RLS enforces).
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
  if (profile.role === "Client") {
    return { ok: false, error: "Clients cannot post tracking updates" };
  }
  const supabase = await createClient();

  const { error: logError } = await supabase.from("shipment_tracking_logs").insert({
    shipment_id: input.shipmentId,
    event_type: "gps",
    level: input.status === "Customs Hold" ? "warning" : "info",
    message: input.message,
    location: input.location,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    created_by: profile.id,
  });
  if (logError) return { ok: false, error: logError.message };

  const patch: ShipmentUpdate = { current_location: input.location };
  if (input.lat != null) patch.current_lat = input.lat;
  if (input.lng != null) patch.current_lng = input.lng;
  if (input.progress != null) patch.progress = input.progress;
  if (input.status) patch.status = input.status;

  const { error: shpError } = await supabase
    .from("shipments")
    .update(patch)
    .eq("id", input.shipmentId);
  if (shpError) return { ok: false, error: shpError.message };

  revalidatePath("/tracking");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function canPostUpdates(role: string): Promise<boolean> {
  return isStaff(role as never) || role === "Carrier";
}
