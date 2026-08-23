import Link from "next/link";
import {
  Package,
  Radar,
  MapPin,
  CalendarClock,
  CheckCircle2,
  Truck,
} from "lucide-react";
import type { Shipment } from "@/types";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * Customer dashboard — a deliberately simple view: my parcels + track.
 * Rows are RLS-scoped to parcels assigned to this account (client_id).
 */
export default function CustomerDashboard({ parcels }: { parcels: Shipment[] }) {
  const active = parcels.filter(
    (p) => !["Delivered", "Cancelled", "Archived", "Returned"].includes(p.status),
  );
  const delivered = parcels.filter((p) => p.status === "Delivered");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero / track CTA */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-950 p-8 rounded-2xl text-white shadow-xl">
        <h2 className="text-2xl font-black tracking-tight">My Parcels</h2>
        <p className="text-slate-300 text-xs mt-1">
          Track deliveries assigned to your account in real time.
        </p>
        <Link
          href="/track"
          className="mt-5 inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
        >
          <Radar className="w-4 h-4" />
          Track Parcel
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total" value={parcels.length} icon={Package} tone="pink" />
        <KpiCard label="On the Way" value={active.length} icon={Truck} tone="amber" />
        <KpiCard label="Delivered" value={delivered.length} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Assigned Parcels
          </h3>
        </div>
        {parcels.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No parcels yet"
            description="When a seller ships a parcel to you, it will appear here automatically."
            action={
              <Link href="/track" className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline">
                Track by number instead
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3 font-bold">Tracking Number</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Current Location</th>
                  <th className="px-5 py-3 font-bold">Expected Delivery</th>
                  <th className="px-5 py-3 font-bold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {parcels.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/track?q=${encodeURIComponent(p.tracking_number ?? "")}`}
                        className="font-mono font-bold text-pink-600 dark:text-pink-400 hover:underline inline-flex items-center gap-1.5"
                      >
                        <Radar className="w-3 h-3" />
                        {p.tracking_number ?? p.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {p.current_location ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        {p.expected_delivery_date ? formatDate(p.expected_delivery_date) : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(p.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {parcels.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/track?q=${encodeURIComponent(p.tracking_number ?? "")}`}
                    className="block px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-pink-600 dark:text-pink-400">
                        {p.tracking_number ?? p.reference}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.current_location ?? "—"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      Expected{" "}
                      {p.expected_delivery_date ? formatDate(p.expected_delivery_date) : "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
