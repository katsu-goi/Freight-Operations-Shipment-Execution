"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Package } from "lucide-react";
import ModeIcon from "@/components/ui/ModeIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { TRANSPORT_MODES } from "@/lib/utils";
import type { Shipment } from "@/types";

export default function ShipmentsTable({
  shipments,
  showModeFilter = true,
  initialQuery = "",
}: {
  shipments: Shipment[];
  showModeFilter?: boolean;
  initialQuery?: string;
}) {
  const [mode, setMode] = useState<string>("All");
  const [q, setQ] = useState(initialQuery);
  const [page, setPage] = useState(1);

  const pageSize = 25;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return shipments.filter((s) => {
      const matchesMode = mode === "All" || s.mode === mode;
      const matchesTerm =
        !term ||
        [s.reference, s.tracking_number, s.client_name, s.origin, s.destination, s.po_number]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term));
      return matchesMode && matchesTerm;
    });
  }, [shipments, mode, q]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Shipment Files</h3>
          <p className="text-slate-500 text-xs">
            {rows.length} of {shipments.length} shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          {showModeFilter &&
            ["All", ...TRANSPORT_MODES].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mode === m
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
        </div>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
            <tr>
              <th className="px-5 py-3">Shipment / Track</th>
              <th className="px-5 py-3">Client & PO</th>
              <th className="px-5 py-3">Route</th>
              <th className="px-5 py-3">Mode & Vessel</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">ETA</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10">
                  <EmptyState
                    icon={Package}
                    title="No shipments found"
                    description="No active shipments match your criteria. Create a booking to start."
                  />
                </td>
              </tr>
            ) : (
              pageRows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{s.reference}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {s.tracking_number ?? "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">
                      {s.client_name}
                    </div>
                    {s.po_number && (
                      <span className="text-[10px] text-pink-600 font-mono bg-pink-50 px-1.5 py-0.5 rounded">
                        {s.po_number}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-slate-800">
                        {s.origin}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {s.destination}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1.5">
                      <ModeIcon mode={s.mode} />
                      <span className="font-bold text-slate-800">{s.mode}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {s.vessel ?? "Unassigned"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700">
                    {formatDate(s.eta)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/tracking?shipment=${s.id}`}
                      className="text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline inline-flex items-center"
                    >
                      Live Track <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {rows.length > pageSize && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              {rows.length === 0
                ? "0 results"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    rows.length,
                  )} of ${rows.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-all"
              >
                Prev
              </button>
              <span className="text-[11px] text-slate-500 font-mono px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
