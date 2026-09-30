import { Package, Truck, CheckCircle2, AlertTriangle, Weight, Banknote } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeAnalytics } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import KpiCard from "@/components/ui/KpiCard";
import { PlatformPie, StatusBars, WeightTrend } from "@/components/analytics/AnalyticsCharts";
import type { Shipment } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Data Analytics — numeric cards (numbers) + graphical charts (graphs).
 * Admin / SuperAdmin only.
 */
export default async function AnalyticsPage() {
  await requirePermission("analytics.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);
  const a = computeAnalytics((data ?? []) as Shipment[]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Data Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Delivery performance, platform mix, and weight trends across the hub.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total parcels" value={formatNumber(a.total)} icon={Package} tone="pink" hint={`${a.deliveryRate}% delivered`} />
        <KpiCard label="Delivered" value={formatNumber(a.delivered)} icon={CheckCircle2} tone="emerald" hint="Completed POD" />
        <KpiCard label="In transit" value={formatNumber(a.inTransit)} icon={Truck} tone="blue" hint="Moving now" />
        <KpiCard label="Failed / returned" value={formatNumber(a.failed)} icon={AlertTriangle} tone="amber" hint="Needs attention" />
        <KpiCard label="Total weight" value={`${formatNumber(a.totalWeightKg)} kg`} icon={Weight} tone="blue" hint={`Avg ${a.avgWeightKg} kg/parcel`} />
        <KpiCard label="Total COD" value={`₱${formatNumber(a.totalCod)}`} icon={Banknote} tone="emerald" hint="Cash on delivery" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Parcels by platform</h2>
          <p className="text-xs text-slate-500 mb-4">Courier / marketplace mix</p>
          <PlatformPie data={a.platformShare} />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Parcels by status</h2>
          <p className="text-xs text-slate-500 mb-4">Lifecycle distribution</p>
          <StatusBars data={a.statusBreakdown} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Weight throughput (kg / month)</h2>
        <p className="text-xs text-slate-500 mb-4">Last 7 month buckets</p>
        <WeightTrend data={a.weightTrend} />
      </div>
    </div>
  );
}
