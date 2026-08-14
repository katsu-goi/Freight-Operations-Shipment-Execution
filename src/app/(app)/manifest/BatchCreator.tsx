"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, CheckCircle2 } from "lucide-react";
import { createBatch } from "./actions";
import { DELIVERY_PLATFORMS } from "@/lib/utils";
import type { DeliveryPlatform, Shipment } from "@/types";

export default function BatchCreator({
  parcels,
}: {
  parcels: Shipment[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<DeliveryPlatform>("J&T Express");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const byPlatform = new Map<string, Shipment[]>();
  for (const p of parcels) {
    const list = byPlatform.get(p.platform) ?? [];
    list.push(p);
    byPlatform.set(p.platform, list);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set((byPlatform.get(platform) ?? []).map((p) => p.id)));
  }

  async function submit() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const res = await createBatch({ platform, parcelIds: ids });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Batch creation failed");
      return;
    }
    setSuccess(`Manifest ${res.value.reference} created (${ids.length} parcels).`);
    setSelected(new Set());
    router.refresh();
  }

  const pool = byPlatform.get(platform) ?? [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-500" /> New Manifest
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          Pick a platform — only its Intake parcels can be batched together.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Delivery platform
          </label>
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value as DeliveryPlatform);
              setSelected(new Set());
            }}
            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {DELIVERY_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p} — {byPlatform.get(p)?.length ?? 0} parcels
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{selected.size} selected</span>
          <button
            onClick={selectAll}
            className="font-bold text-pink-600 dark:text-pink-400 hover:underline"
          >
            Select all
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
          {pool.length === 0 && (
            <p className="p-4 text-[11px] text-slate-400">
              No Intake parcels for this platform yet.
            </p>
          )}
          {pool.map((p) => (
            <label
              key={p.id}
              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="mt-0.5 accent-pink-600"
              />
              <span className="text-xs">
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block">
                  {p.reference}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {p.consignee ?? p.client_name} → {p.destination}
                </span>
              </span>
            </label>
          ))}
        </div>

        {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        {success && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {success}
          </p>
        )}

        <button
          onClick={submit}
          disabled={submitting || selected.size === 0}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          {submitting ? "Saving…" : `Batch ${selected.size} parcel${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}