"use client";

import { useState } from "react";
import { Boxes, Plus, Loader2, Ship, Weight, Box } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { createContainer } from "./actions";
import type { ContainerWithShipments, LoadType } from "@/types";

function pct(current: number, max: number) {
  if (!max) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

function UtilBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ConsolidationBoard({
  containers,
  canManage,
}: {
  containers: ContainerWithShipments[];
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    reference: "",
    containerType: "40ft High Cube Container",
    loadType: "FCL" as LoadType,
    maxVolumeCbm: 76.2,
    maxWeightKg: 28600,
    origin: "",
    destination: "",
    vessel: "",
  });

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await createContainer(form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Failed");
      return;
    }
    setShowForm(false);
    setForm((f) => ({ ...f, reference: "", origin: "", destination: "", vessel: "" }));
  }

  const field = "w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500";
  const label = "block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1";

  return (
    <div className="space-y-6">
      {canManage && (
        <div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Plan New Container
          </button>

          {showForm && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Container reference</label>
                <input className={field} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="CONT-40HQ-1029" />
              </div>
              <div>
                <label className={label}>Container type</label>
                <input className={field} value={form.containerType} onChange={(e) => setForm({ ...form, containerType: e.target.value })} />
              </div>
              <div>
                <label className={label}>Load type</label>
                <select className={field} value={form.loadType} onChange={(e) => setForm({ ...form, loadType: e.target.value as LoadType })}>
                  <option value="FCL">FCL (Full Container Load)</option>
                  <option value="LCL">LCL (Less than Container Load)</option>
                </select>
              </div>
              <div>
                <label className={label}>Vessel</label>
                <input className={field} value={form.vessel} onChange={(e) => setForm({ ...form, vessel: e.target.value })} placeholder="MV SuperCat / Truck Fleet-PH" />
              </div>
              <div>
                <label className={label}>Max volume (CBM)</label>
                <input type="number" className={field} value={form.maxVolumeCbm} onChange={(e) => setForm({ ...form, maxVolumeCbm: Number(e.target.value) })} />
              </div>
              <div>
                <label className={label}>Max weight (kg)</label>
                <input type="number" className={field} value={form.maxWeightKg} onChange={(e) => setForm({ ...form, maxWeightKg: Number(e.target.value) })} />
              </div>
              <div>
                <label className={label}>Origin</label>
                <input className={field} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Manila Port (PHMNL)" />
              </div>
              <div>
                <label className={label}>Destination</label>
                <input className={field} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Cebu Port (PHCEB)" />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <button onClick={submit} disabled={saving || !form.reference} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create container
                </button>
                {error && <span className="text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {containers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <EmptyState
            icon={Boxes}
            title="No containers planned"
            description="Plan a container to begin LCL/FCL consolidation and load balancing."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {containers.map((c) => {
            const volPct = pct(Number(c.current_volume_cbm), Number(c.max_volume_cbm));
            const wtPct = pct(Number(c.current_weight_kg), Number(c.max_weight_kg));
            return (
              <div key={c.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-900 text-white rounded-lg">
                      <Box className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.reference}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.container_type}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={c.status} />
                    <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded">
                      {c.load_type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <UtilBar label="Volume utilization" value={volPct} tone="bg-pink-500" />
                  <UtilBar label="Weight utilization" value={wtPct} tone="bg-blue-500" />
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Ship className="w-3.5 h-3.5" /> {c.vessel ?? "Unassigned"}</span>
                  <span className="flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> {Number(c.current_weight_kg).toLocaleString()} / {Number(c.max_weight_kg).toLocaleString()} kg</span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {c.origin} → {c.destination}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Consolidated shipments ({c.shipments.length})
                  </p>
                  {c.shipments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">No shipments loaded yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {c.shipments.map((s) => (
                        <span key={s.id} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                          {s.reference}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
