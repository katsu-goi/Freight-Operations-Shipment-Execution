import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { applyReportFilters } from "@/lib/reports";
import { DELIVERY_PLATFORMS } from "@/lib/utils";
import type { Shipment } from "@/types";

export const dynamic = "force-dynamic";

const STATUSES = [
  "",
  "Registered",
  "Intake",
  "Batched",
  "Handed Over",
  "In Transit",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

function qs(
  base: Record<string, string>,
  overrides: Record<string, string> = {},
) {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("reports.view");
  const sp = await searchParams;
  const filters = {
    from: sp.from ?? "",
    to: sp.to ?? "",
    status: sp.status ?? "",
    platform: sp.platform ?? "",
    search: sp.search ?? "",
  };

  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = applyReportFilters((data ?? []) as Shipment[], filters);
  const totalKg = rows.reduce((a, r) => a + Number(r.weight_kg ?? 0), 0);

  const base = {
    from: filters.from,
    to: filters.to,
    status: filters.status,
    platform: filters.platform,
    search: filters.search,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter shipments, then export to CSV or PDF. {rows.length} rows ·{" "}
            {totalKg.toFixed(1)} kg total.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/reports/export${qs(base, { format: "csv" })}`}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition"
          >
            Export CSV
          </Link>
          <Link
            href={`/api/reports/export${qs(base, { format: "pdf" })}`}
            target="_blank"
            className="rounded-xl bg-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-white transition"
          >
            Export PDF (print)
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="grid grid-cols-2 md:grid-cols-6 gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
      >
        <label className="text-xs font-semibold text-slate-500">
          From
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 text-slate-900 dark:text-white"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          To
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 text-slate-900 dark:text-white"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Status
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 text-slate-900 dark:text-white [&>option]:text-slate-900"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Platform
          <select
            name="platform"
            defaultValue={filters.platform}
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 text-slate-900 dark:text-white [&>option]:text-slate-900"
          >
            <option value="">All platforms</option>
            {DELIVERY_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500 col-span-2 md:col-span-1">
          Search
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Ref, client, destination…"
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-2 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </label>
        <div className="flex items-end gap-2 col-span-2 md:col-span-1">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-pink-600 hover:bg-pink-500 px-3 py-2 text-xs font-bold text-white transition cursor-pointer"
          >
            Apply
          </button>
          <Link
            href="/reports"
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-xs min-w-[760px]">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Weight</th>
              <th className="px-4 py-3 text-right">COD ₱</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.id} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-2.5 font-mono font-bold">{r.reference}</td>
                <td className="px-4 py-2.5">{r.client_name}</td>
                <td className="px-4 py-2.5">
                  {r.origin} → {r.destination}
                </td>
                <td className="px-4 py-2.5">{r.platform}</td>
                <td className="px-4 py-2.5">{r.status}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {Number(r.weight_kg ?? 0).toFixed(1)} kg
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  ₱{Number(r.cod_amount ?? 0).toFixed(2)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
