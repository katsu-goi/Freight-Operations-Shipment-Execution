import { requireRole, isStaff, OPS_ROLES } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { listShipmentsForBol } from "@/lib/repos/shipments";
import { listBillsOfLading } from "@/lib/repos/bol";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";
import BolGenerator from "./BolGenerator";

export const dynamic = "force-dynamic";

export default async function BolPage() {
  const profile = await requireRole(OPS_ROLES);

  const [shipments, bolList] = await Promise.all([
    listShipmentsForBol(),
    listBillsOfLading(),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Documentation"
        title="House & Master Bill of Lading Generator"
        description="Generate, parse, and print HBL / MBL documents linked to shipment files."
      />

      {isStaff(profile.role) ? (
        <BolGenerator shipments={shipments} aiEnabled={aiEnabled()} />
      ) : (
        <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
          Planner access is read-only here. Ask Admin/Dispatcher to issue Bills of Lading.
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Issued Bills of Lading</h3>
        </div>
        {bolList.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Bills of Lading issued"
            description="Generate an HBL or MBL above to see it listed here."
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">BoL No.</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Shipper → Consignee</th>
                  <th className="px-5 py-3">Vessel</th>
                  <th className="px-5 py-3">POL → POD</th>
                  <th className="px-5 py-3">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {bolList.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">{b.bol_number}</td>
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
