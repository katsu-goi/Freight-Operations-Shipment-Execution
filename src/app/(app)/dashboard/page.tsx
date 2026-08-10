import Link from "next/link";
import {
  Activity,
  Plus,
  FileText,
  Package,
  Globe,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isStaff } from "@/lib/auth";
import { listRecentShipments } from "@/lib/repos/shipments";
import { listTrackingLogs } from "@/lib/repos/loadplans";
import { computeStats, monthlyVolume } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import KpiCard from "@/components/ui/KpiCard";
import VolumeChart from "@/components/dashboard/VolumeChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ShipmentsTable from "@/components/shipments/ShipmentsTable";
import type { TrackingLog } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();

  const [list, recentLogs] = await Promise.all([
    listRecentShipments(),
    listTrackingLogs(undefined, 15),
  ]);
  const stats = computeStats(list);
  const volume = monthlyVolume(list);
  const staff = isStaff(profile.role);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-pink-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Active Freight Execution Hub
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Shipment &amp; Logistics Operations
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Real-time monitoring of domestic Philippine freight, container
            consolidation, and automated compliance.
          </p>
        </div>
        {staff && (
          <div className="flex items-center gap-3">
            <Link
              href="/booking"
              className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center space-x-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Booking</span>
            </Link>
            <Link
              href="/bol"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Generate BoL</span>
            </Link>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Shipments"
          value={stats.active}
          icon={Package}
          tone="pink"
          hint={`${formatNumber(stats.totalWeightKg)} kg total cargo`}
        />
        <KpiCard
          label="In Transit (Global)"
          value={stats.inTransit}
          icon={Globe}
          tone="blue"
          hint="Currently moving"
        />
        <KpiCard
          label="Customs / Holds"
          value={stats.customsHold}
          icon={AlertTriangle}
          tone="amber"
          hint={stats.customsHold ? "Action required" : "All clear"}
        />
        <KpiCard
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          tone="emerald"
          hint={`${stats.delayed} delayed`}
        />
      </div>

      {/* Charts + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Monthly Multimodal Volume
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Ocean vs Air vs Road vs Rail distribution
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-200 inline-block mr-1" />
                Ocean
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block mr-1" />
                Air
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block mr-1" />
                Road
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block mr-1" />
                Rail
              </span>
            </div>
          </div>
          <VolumeChart data={volume} />
        </div>

        <ActivityFeed initial={(recentLogs) as TrackingLog[]} />
      </div>

      {/* Shipments table */}
      <ShipmentsTable shipments={list} />
    </div>
  );
}
