import { requirePermission } from "@/lib/auth";
import { listAuditLogs } from "@/lib/repos/auditlogs";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs — Airship Express" };

const ACTION_TONE: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

/** Human-readable summary of what changed. */
function describe(row: Awaited<ReturnType<typeof listAuditLogs>>[number]): string {
  const nd = row.new_data ?? {};
  const od = row.old_data ?? {};
  const label =
    (nd.name as string) ??
    (od.name as string) ??
    (nd.reference as string) ??
    (od.reference as string) ??
    (nd.tracking_number as string) ??
    (nd.email as string) ??
    row.record_id?.slice(0, 8) ??
    "—";

  if (row.action === "INSERT") return `Created ${row.table_name}: ${label}`;
  if (row.action === "DELETE") return `Deleted ${row.table_name}: ${label}`;

  const changes: string[] = [];
  for (const key of Object.keys(nd)) {
    if (key === "updated_at" || key === "created_at") continue;
    const before = od[key];
    const after = nd[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push(key);
    }
  }
  const statusChange =
    changes.includes("status") && row.table_name === "shipments"
      ? ` → ${(nd.status as string) ?? ""}`
      : "";
  return `Updated ${row.table_name}${changes.length ? ` (${changes.slice(0, 4).join(", ")})` : ""}: ${label}${statusChange}`;
}

export default async function AuditLogsPage() {
  await requirePermission("audit.view");
  const logs = await listAuditLogs(200);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Security"
        title="Audit Logs"
        description="Immutable trail of administrative and data changes across the system."
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries yet"
            description="Administrative actions and data changes will be recorded here."
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-3 flex items-start gap-3 text-xs">
                <span
                  className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${ACTION_TONE[log.action] ?? ""}`}
                >
                  {log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {describe(log)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Actor: {log.actorEmail ?? "system"} ·{" "}
                    {formatDateTime(new Date(log.created_at).toISOString())}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
