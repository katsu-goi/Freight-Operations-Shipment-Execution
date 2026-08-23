import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CustomerRow, Shipment } from "@/types";

/**
 * Customer directory (Customer role + legacy Client alias).
 * Readable by staff only — the calling page enforces `customers.view`.
 */
export const listCustomers = cache(async (): Promise<CustomerRow[]> => {
  const supabase = await createClient();

  const [{ data: profiles }, { data: parcels }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active, created_at")
      .in("role", ["Customer", "Client"])
      .order("created_at", { ascending: false }),
    supabase.from("shipments").select("id, client_id, status"),
  ]);

  const stats = new Map<string, { total: number; active: number; delivered: number }>();
  for (const p of (parcels ?? []) as Pick<Shipment, "id" | "client_id" | "status">[]) {
    if (!p.client_id) continue;
    const s = stats.get(p.client_id) ?? { total: 0, active: 0, delivered: 0 };
    s.total += 1;
    if (p.status === "Delivered") s.delivered += 1;
    else if (!["Cancelled", "Archived", "Returned"].includes(p.status)) s.active += 1;
    stats.set(p.client_id, s);
  }

  return ((profiles ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    role: CustomerRow["role"];
    is_active: boolean;
    created_at: string;
  }[]).map((p) => ({
    ...p,
    createdAt: p.created_at,
    parcelCount: stats.get(p.id)?.total ?? 0,
    activeCount: stats.get(p.id)?.active ?? 0,
    deliveredCount: stats.get(p.id)?.delivered ?? 0,
  }));
});
