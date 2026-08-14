"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Loader2, CheckCircle2 } from "lucide-react";
import { signHandover } from "./actions";
import { formatDate } from "@/lib/utils";
import type { CarrierBatch } from "@/types";

const FORM = { riderName: "", riderPhone: "", notes: "" };

export default function HandoverSignoff({
  batches,
}: {
  batches: CarrierBatch[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(batchId: string) {
    if (!form.riderName.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await signHandover({
      batchId,
      riderName: form.riderName.trim(),
      riderPhone: form.riderPhone,
      notes: form.notes,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Sign-off failed");
      return;
    }
    setForm(FORM);
    setOpenId(null);
    router.refresh();
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {batches.map((b) => (
        <div key={b.id} className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {b.reference}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                {b.platform} · {b.parcel_count} parcels · {Number(b.total_weight_kg).toFixed(1)} kg
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{formatDate(b.updated_at)}</span>
          </div>

          {openId === b.id ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={form.riderName}
                onChange={(e) => setForm((f) => ({ ...f, riderName: e.target.value }))}
                placeholder="Rider name *"
                className="border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                value={form.riderPhone}
                onChange={(e) => setForm((f) => ({ ...f, riderPhone: e.target.value }))}
                placeholder="Rider phone"
                className="border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="md:col-span-3 flex items-center gap-3">
                {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
                <button
                  onClick={() => submit(b.id)}
                  disabled={submitting || !form.riderName.trim()}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm handover
                </button>
                <button
                  onClick={() => {
                    setOpenId(null);
                    setForm(FORM);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <button
                onClick={() => {
                  setOpenId(b.id);
                  setForm(FORM);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <PenLine className="w-3.5 h-3.5" /> Sign off handover
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}