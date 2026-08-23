import Link from "next/link";
import {
  Package,
  PackageSearch,
  Truck,
  Warehouse,
  Send,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Radar,
  MapPin,
} from "lucide-react";
import type { Shipment } from "@/types";
import KpiCard from "@/components/ui/KpiCard";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

const ACTIVE = ["Registered", "Pickup Scheduled", "Picked Up", "Dropped Off", "Intake"];
const TRANSIT = ["Picked Up", "Dropped Off", "In Transit", "Handed Over"];
const HUBS = ["At Origin Hub", "At Destination Hub", "Batched"];

/**
 * Seller dashboard — the sending client's own parcel overview.
 * Data is already RLS-scoped to this seller's parcels.
 */
export default function SellerDashboard({
  parcels,
  sellerName,
}: {
  parcels: Shipment[];
  sellerName: string | null;
}) {
  const pending = parcels.filter((p) => ACTIVE.includes(p.status)).length;
  const inTransit = parcels.filter((p) => TRANSIT.includes(p.status)).length;
  const atHub = parcels.filter((p) => HUBS.includes(p.status)).length;
  const outForDelivery = parcels.filter((p) => p.status === "Out for Delivery").length;
  const delivered = parcels.filter((p) => p.status === "Delivered").length;
  const issues = parcels.filter((p) =>
    ["Delivery Failed", "Returned"].includes(p.status),
  ).length;

  const recent = parcels.slice(0, 8);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-pink-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4" /> Seller Dashboard
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Welcome back{sellerName ? `, ${sellerName}` : ""}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Register parcels and follow them across the delivery network.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/parcels/new"
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center space-x-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Register Parcel</span>
          </Link>
          <Link
            href="/track"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all"
          >
            <Radar className="w-4 h-4" />
            <span>Track</span>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <KpiCard label="My Parcels" value={parcels.length} icon={Package} tone="pink" />
        <KpiCard label="Pending" value={pending} icon={PackageSearch} tone="blue" />
        <KpiCard label="In Transit" value={inTransit} icon={Truck} tone="amber" />
        <KpiCard label="At Hub" value={atHub} icon={Warehouse} tone="amber" />
        <KpiCard label="Out for Delivery" value={outForDelivery} icon={Send} tone="blue" />
        <KpiCard label="Delivered" value={delivered} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Issues" value={issues} icon={AlertTriangle} tone={issues ? "pink" : "emerald"} hint={issues ? "Needs attention" : undefined} />
      </div>

      {/* Recent parcels */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Recent Parcels</h3>
          <Link href="/parcels" className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No parcels yet"
            description="Register your first parcel to start tracking it."
            action={
              <Link href="/parcels/new" className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline">
                Register Parcel
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/parcels/${p.id}`}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-pink-600 dark:text-pink-400 truncate">
                      {p.tracking_number ?? p.reference}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.current_location ?? "—"} · updated {formatDate(p.updated_at)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
