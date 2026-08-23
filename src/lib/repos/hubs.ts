import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Hub } from "@/types";

/** All hubs (active first). Readable by any authenticated user via RLS. */
export const listHubs = cache(async (): Promise<Hub[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hubs")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });
  return (data ?? []) as Hub[];
});

export async function getHubById(id: string): Promise<Hub | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hubs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Hub) ?? null;
}

/** Parcel counts per hub for the facilities table. */
export async function getHubParcelCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("current_hub_id")
    .not("current_hub_id", "is", null);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const hubId = (row as { current_hub_id: string | null }).current_hub_id;
    if (!hubId) continue;
    counts.set(hubId, (counts.get(hubId) ?? 0) + 1);
  }
  return counts;
}
