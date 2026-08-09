import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { Layers, Link2, Package } from "lucide-react";
import type { PurchaseOrderWithItems } from "@/types";

export const dynamic = "force-dynamic";

function fulfillment(items: PurchaseOrderWithItems["items"]) {
  const ordered = items.reduce((a, i) => a + Number(i.qty_ordered), 0);
  const shipped = items.reduce((a, i) => a + Number(i.qty_shipped), 0);
  return { ordered, shipped, pct: ordered ? Math.round((shipped / ordered) * 100) : 0 };
}

export default async function PurchaseOrdersPage() {
  await requireRole(["Admin", "Dispatcher", "Planner", "Client"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("purchase_orders")
    .select("*, items:purchase_order_items(*), shipment:shipments(reference, status)")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as (PurchaseOrderWithItems & {
    shipment: { reference: string; status: string } | null;
  })[];

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Purchase Order Integration"
        title="PO Linking & Line-Item Fulfillment"
        description="Link PO numbers to freight shipments and track line-item fulfillment against SLA."
      />

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <EmptyState
            icon={Layers}
            title="No purchase orders"
            description="Purchase orders linked to shipments will appear here with fulfillment tracking."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((po) => {
            const f = fulfillment(po.items);
            return (
              <div key={po.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{po.po_number}</h3>
                      <StatusBadge status={po.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {po.client_name} · Vendor: {po.vendor ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Value</div>
                      <div className="font-bold text-slate-900 text-sm">{formatCurrency(Number(po.total_amount), po.currency)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Linked shipment</div>
                      {po.shipment ? (
                        <div className="font-mono text-xs text-pink-600 flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> {po.shipment.reference}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">Unlinked</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                    <span>Line-item fulfillment</span>
                    <span className="font-mono">{f.shipped} / {f.ordered} units · {f.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-600 to-rose-500" style={{ width: `${f.pct}%` }} />
                  </div>
                </div>

                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-white text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-2.5">SKU</th>
                        <th className="px-5 py-2.5">Item</th>
                        <th className="px-5 py-2.5 text-right">Ordered</th>
                        <th className="px-5 py-2.5 text-right">Shipped</th>
                        <th className="px-5 py-2.5 text-right">Unit Price</th>
                        <th className="px-5 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {po.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                            <Package className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            No line items on this PO.
                          </td>
                        </tr>
                      ) : (
                        po.items.map((item) => {
                          const complete = Number(item.qty_shipped) >= Number(item.qty_ordered);
                          return (
                            <tr key={item.id}>
                              <td className="px-5 py-2.5 font-mono text-slate-800">{item.sku}</td>
                              <td className="px-5 py-2.5">{item.name}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{Number(item.qty_ordered).toLocaleString()}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{Number(item.qty_shipped).toLocaleString()}</td>
                              <td className="px-5 py-2.5 text-right font-mono">{formatCurrency(Number(item.unit_price), po.currency)}</td>
                              <td className="px-5 py-2.5 text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {complete ? "Fulfilled" : "Partial"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
