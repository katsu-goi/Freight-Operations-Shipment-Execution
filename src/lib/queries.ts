import { createClient } from "@/lib/supabase/server";
import type { Shipment } from "@/types";

export { computeStats, monthlyVolume, MODES } from "@/lib/stats";

/** Fetch all shipments visible to the current user (RLS-scoped). */
export async function getShipments(): Promise<Shipment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}