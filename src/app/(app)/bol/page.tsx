import { requireRole, isStaff, OPS_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled } from "@/lib/ai";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import BolGenerator from "./BolGenerator";
import type { BillOfLading, Shipment } from "@/types";

export const dynamic = "force-dynamic";

export default async function BolPage() {
  const profile = await requireRole(OPS_ROLES);
  const supabase = await createClient();

  const [{ data: shipments }, { data: bols }] = await Promise.all([
    supabase
      .from("shipments")
      .select("id, reference, shipper, consignee, vessel, origin, destination, container_no, weight_kg, volume_cbm")
      .order("created_at", { ascending: false }),
    supabase
      .from("bills_of_lading")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const bolList = (bols ?? []) as BillOfLading[];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Documentation"
        title="House & Master Bill of Lading Generator"
        description="Generate, parse, and print HBL / MBL documents linked to shipment files."
      />

      {isStaff(profile.role) ? (
        <BolGenerator
          shipments={(shipments ?? []) as Shipment[]}
          aiEnabled={aiEnabled()}
        />
      ) : (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Planner access is read-only here. Ask Admin/Dispatcher to issue Bills of Lading.
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Issued Bills of Lading</h3>
        </div>
        {bolList.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Bills of Lading issued"
            description="Generate an HBL or MBL above to see it listed here."
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">BoL No.</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Shipper → Consignee</th>
                  <th className="px-5 py-3">Vessel</th>
                  <th className="px-5 py-3">POL → POD</th>
                  <th className="px-5 py-3">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bolList.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{b.bol_number}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.bol_type} /></td>
                    <td className="px-5 py-3.5">{b.shipper_name ?? "—"} → {b.consignee_name ?? "—"}</td>
                    <td className="px-5 py-3.5">{b.vessel_name ?? "—"}</td>
                    <td className="px-5 py-3.5">{b.port_of_loading ?? "—"} → {b.port_of_discharge ?? "—"}</td>
                    <td className="px-5 py-3.5 font-mono">{formatDate(b.issued_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
