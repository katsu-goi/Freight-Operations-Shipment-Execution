"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Archive, Loader2 } from "lucide-react";
import { cancelBooking, archiveBooking } from "./actions";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Shipment } from "@/types";

export default function BookingTable({ rows }: { rows: Shipment[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function doCancel(shipment: Shipment) {
    const reason = window.prompt(`Cancellation reason for ${shipment.reference}:`);
    if (!reason || !reason.trim()) return;
    setPendingId(shipment.id);
    setError(null);
    void cancelBooking(shipment.id, reason.trim()).then((res) => {
      setPendingId(null);
      if (!res.ok) setError(res.error ?? "Cancel failed");
      else router.refresh();
    });
  }

  function doArchive(shipment: Shipment) {
    setPendingId(shipment.id);
    setError(null);
    void archiveBooking(shipment.id).then((res) => {
      setPendingId(null);
      if (!res.ok) setError(res.error ?? "Archive failed");
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-400">
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="text-left px-5 py-3">Ref</th>
              <th className="text-left px-3 py-3">Seller / Recipient</th>
              <th className="text-left px-3 py-3">Platform</th>
              <th className="text-left px-3 py-3">Destination</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-5 py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {r.reference}
                  <div className="text-[10px] text-slate-400 font-sans">
                    {formatDate(r.created_at)}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {r.client_name}
                  </div>
                  <div className="text-[10px] text-slate-400">{r.consignee ?? "—"}</div>
                </td>
                <td className="px-3 py-3">{r.platform}</td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                  {r.destination}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-3">
                  {r.status !== "Handed Over" && r.status !== "Cancelled" ? (
                    <div className="flex items-center justify-end gap-1.5">
                      {pendingId === r.id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      )}
                      {r.status !== "Archived" && (
                        <button
                          onClick={() => doArchive(r)}
                          title="Archive"
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => doCancel(r)}
                        title="Cancel"
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      {formatNumber(r.weight_kg)} kg
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="px-5 py-3 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}