import { readFile } from "node:fs/promises";
import path from "node:path";
import { Database } from "lucide-react";
import { requireRole } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import CopyButton from "@/components/ui/CopyButton";

export const dynamic = "force-dynamic";

const TABLES = [
  { name: "profiles", desc: "User + RBAC role (1:1 with auth.users)" },
  { name: "shipments", desc: "Core shipment files, multimodal" },
  { name: "shipment_tracking_logs", desc: "Realtime location & status events" },
  { name: "containers", desc: "LCL/FCL consolidation units" },
  { name: "container_shipments", desc: "Consolidation junction" },
  { name: "bills_of_lading", desc: "House & Master BoL documents" },
  { name: "purchase_orders", desc: "PO headers linked to shipments" },
  { name: "purchase_order_items", desc: "PO line items & fulfillment" },
];

export default async function SchemaPage() {
  await requireRole(["Admin"]);

  let sql = "";
  try {
    sql = await readFile(
      path.join(process.cwd(), "supabase", "migrations", "0001_initial_schema.sql"),
      "utf8",
    );
  } catch {
    sql = "-- supabase/migrations/0001_initial_schema.sql not found in deployment bundle.";
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Database"
        title="Supabase DDL Schema"
        description="Apply this in the Supabase SQL Editor. Includes enums, tables, RLS policies, realtime, and triggers."
        actions={<CopyButton text={sql} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {TABLES.map((t) => (
          <div key={t.name} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-3.5 h-3.5 text-pink-600" />
              <span className="font-mono text-xs font-bold text-slate-900">{t.name}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">migrations/0001_initial_schema.sql</span>
          <CopyButton text={sql} />
        </div>
        <pre className="p-4 text-[11px] leading-relaxed text-slate-300 overflow-x-auto scroll-thin max-h-[70vh] font-mono">
          {sql}
        </pre>
      </div>
    </div>
  );
}
