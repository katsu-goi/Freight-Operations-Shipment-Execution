"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { generateLoadPlanDraft, setLoadPlanStatus } from "./actions";
import type { LoadPlan } from "@/types";

export default function LoadAllocationBoard({
  plans,
  canApprove,
}: {
  plans: LoadPlan[];
  canApprove: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function runGenerate() {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await generateLoadPlanDraft();
      if (!res.ok) {
        setError(res.error ?? "Failed to generate plan");
        return;
      }
      setMessage("Draft load plan created. Staff can approve or reject.");
    });
  }

  function decide(id: string, status: "Approved" | "Rejected") {
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await setLoadPlanStatus(id, status);
      if (!res.ok) setError(res.error ?? "Update failed");
      else setMessage(`Plan ${status.toLowerCase()}.`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={runGenerate}
          className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate ML draft
        </button>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Planner drafts · Admin/Dispatcher approve (maker–checker)
        </p>
      </div>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3">Reference</th>
              <th className="px-5 py-3">Corridor</th>
              <th className="px-5 py-3">Util / Score</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {plans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                  No load plans yet. Generate a draft from Booked shipments.
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 align-top">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">{p.reference}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs">
                      {p.ml_rationale ?? "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {p.origin ?? "—"} → {p.destination ?? "—"}
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {Number(p.planned_weight_kg).toFixed(0)} kg ·{" "}
                      {Number(p.planned_volume_cbm).toFixed(1)} cbm
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono">
                    {Number(p.utilization_pct).toFixed(1)}%
                    {p.ml_score != null ? ` · ${p.ml_score}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3">
                    {canApprove && p.status === "Draft" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => decide(p.id, "Approved")}
                          className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold hover:underline disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => decide(p.id, "Rejected")}
                          className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold hover:underline disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
