import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Seller, SellerWithStats, Shipment } from "@/types";

/** All active sellers with intake counters. Memoized per request. */
export const listSellers = cache(async (): Promise<SellerWithStats[]> => {
  const supabase = await createClient();
  const { data: sellers } = await supabase
    .from("sellers")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const { data: parcels } = await supabase
    .from("shipments")
    .select("id, seller_id, status");

  const counts = new Map<string, { pickups: number; parcels: number }>();
  for (const p of (parcels ?? []) as Shipment[]) {
    if (!p.seller_id) continue;
    const c = counts.get(p.seller_id) ?? { pickups: 0, parcels: 0 };
    c.parcels += 1;
    counts.set(p.seller_id, c);
  }

  return (sellers ?? []).map((s) => ({
    ...s,
    pickupCount: counts.get(s.id)?.pickups ?? 0,
    parcelCount: counts.get(s.id)?.parcels ?? 0,
  }));
});

export const getSellerById = cache(
  async (id: string): Promise<Seller | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sellers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as Seller) ?? null;
  },
);