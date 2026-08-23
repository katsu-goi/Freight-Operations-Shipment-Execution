import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  actor_id: string | null;
  actorEmail: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Audit trail for administrative actions. RLS restricts reads to Admin; this
 * repo is only ever invoked from admin-gated pages.
 */
export const listAuditLogs = cache(
  async (limit = 200): Promise<AuditLogRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("audit_logs")
      .select("*, actor:profiles(email)")
      .order("created_at", { ascending: false })
      .limit(limit);

    return ((data ?? []) as unknown as (Omit<AuditLogRow, "actorEmail"> & {
      actor: { email: string | null } | null;
    })[]).map((row) => ({
      ...row,
      actorEmail: row.actor?.email ?? null,
    }));
  },
);
