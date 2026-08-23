"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, MapPin } from "lucide-react";
import { SETTABLE_STATUSES } from "@/lib/parcelWorkflow";
import { updateParcelStatus, updateParcelLocation } from "../actions";
import type { Hub } from "@/types";
import { useToast } from "@/components/ui/Toast";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all";

/**
 * Staff-only operations panel: change parcel status (atomic RPC writes the
 * tracking event + notifications) or move the parcel between hubs.
 * Render is gated server-side; the actions re-check permissions.
 */
export default function ParcelOpsPanel({
  parcelId,
  currentStatus,
  currentHubId,
  hubs,
}: {
  parcelId: string;
  currentStatus: string;
  currentHubId: string | null;
  hubs: Pick<Hub, "id" | "name">[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onStatusSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateParcelStatus({
        parcelId,
        status: String(formData.get("status") ?? ""),
        hubId: String(formData.get("hubId") ?? ""),
        location: String(formData.get("location") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      if (res.ok) {
        toast.success("Parcel status updated");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onLocationSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateParcelLocation({
        parcelId,
        hubId: String(formData.get("locHubId") ?? ""),
        location: String(formData.get("locText") ?? ""),
      });
      if (res.ok) {
        toast.success("Current location updated");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-5">
      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-pink-600" />
        Operations
      </h3>

      <form onSubmit={(e) => { e.preventDefault(); onStatusSubmit(new FormData(e.currentTarget)); }} className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="ops-status">
            Update Status <span className="text-slate-400 normal-case">(currently {currentStatus})</span>
          </label>
          <select id="ops-status" name="status" defaultValue={currentStatus} className={inputCls} required>
            {[...new Set([currentStatus, ...SETTABLE_STATUSES])].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="ops-hub">
              Facility / Hub
            </label>
            <select id="ops-hub" name="hubId" defaultValue={currentHubId ?? ""} className={inputCls}>
              <option value="">— none —</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1" htmlFor="ops-location">
              Or free-text location
            </label>
            <input id="ops-location" name="location" className={inputCls} placeholder="e.g. Along NLEX, Bulacan" />
          </div>
        </div>
        <input
          name="description"
          className={inputCls}
          placeholder="Optional note recorded with this event"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Apply Update
        </button>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); onLocationSubmit(new FormData(e.currentTarget)); }} className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Move between facilities
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select name="locHubId" defaultValue="" className={inputCls}>
            <option value="">— none —</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <input name="locText" className={inputCls} placeholder="Free-text location" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-60"
        >
          Set Location
        </button>
      </form>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
