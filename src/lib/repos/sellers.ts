import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Seller,
  SellerWithStats,
  SellerAdminRow,
  Shipment,
} from "@/types";

/** All ACTIVE sellers with intake counters. Memoized per request. */
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

  return (sellers ?? []).map((s) => ({
    ...s,
    pickupCount: 0,
    parcelCount: countParcelsFor(parcels, s.id),
  }));
});

function countParcelsFor(
  parcels: Pick<Shipment, "seller_id">[] | null,
  sellerId: string,
): number {
  let n = 0;
  for (const p of parcels ?? []) if (p.seller_id === sellerId) n += 1;
  return n;
}

/**
 * Admin seller directory: every seller (active + archived) with parcel
 * counters and the linked login account's email.
 */
export const listSellersAdmin = cache(async (): Promise<SellerAdminRow[]> => {
  const supabase = await createClient();
  const [{ data: sellers }, { data: parcels }, { data: owners }] =
    await Promise.all([
      supabase.from("sellers").select("*").order("created_at", { ascending: false }),
      supabase.from("shipments").select("id, seller_id, status"),
      supabase
        .from("profiles")
        .select("id, seller_id, email, role, is_active")
        .in("role", ["Seller"]),
    ]);

  const ownerBySeller = new Map<string, { email: string | null; isActive: boolean }>();
  for (const o of owners ?? []) {
    if (o.seller_id) ownerBySeller.set(o.seller_id, { email: o.email, isActive: o.is_active });
  }

  return ((sellers ?? []) as Seller[]).map((s) => ({
    ...s,
    pickupCount: 0,
    parcelCount: countParcelsFor(parcels, s.id),
    archived: !s.is_active,
    ownerEmail: ownerBySeller.get(s.id)?.email ?? null,
    lastActivityAt: s.last_activity_at,
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

/** Associated record counts used by the permanent-delete confirmation. */
export async function getSellerDeleteImpact(sellerId: string): Promise<{
  parcels: number;
  pickups: number;
  trackingRecords: number;
}> {
  const supabase = await createClient();
  const [parcelsRes, pickupsRes] = await Promise.all([
    supabase
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
    supabase
      .from("pickup_requests")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", sellerId),
  ]);
  return {
    parcels: parcelsRes.count ?? 0,
    pickups: pickupsRes.count ?? 0,
    trackingRecords: 0, // refined below when parcels exist
  };
}

/** Total tracking events across all of a seller's parcels. */
export async function getSellerTrackingCount(
  sellerId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("id")
    .eq("seller_id", sellerId);
  const ids = (data ?? []).map((r) => r.id);
  if (ids.length === 0) return 0;
  const { count } = await supabase
    .from("shipment_tracking_logs")
    .select("id", { count: "exact", head: true })
    .in("shipment_id", ids);
  return count ?? 0;
}
