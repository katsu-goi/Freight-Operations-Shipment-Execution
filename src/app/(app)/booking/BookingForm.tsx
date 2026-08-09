"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Sparkles,
  Loader2,
  Leaf,
  Clock,
  PhilippinePeso,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { TRANSPORT_MODES, formatCurrency } from "@/lib/utils";
import { createBooking } from "./actions";
import type { RouteRecommendation, TransportMode } from "@/types";

const INITIAL = {
  clientName: "",
  shipper: "",
  consignee: "",
  origin: "",
  destination: "",
  mode: "Road" as TransportMode,
  cargoType: "LCL Truckload",
  incoterms: "DAP",
  weightKg: 0,
  volumeCbm: 0,
  hazardClass: "None",
  poNumber: "",
};

function riskTone(risk: string) {
  if (risk === "Low") return "bg-emerald-100 text-emerald-700";
  if (risk === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export default function BookingForm({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [routes, setRoutes] = useState<RouteRecommendation[] | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runAiRouting() {
    setRoutingLoading(true);
    setRoutingError(null);
    setRoutes(null);
    try {
      const res = await fetch("/api/ai/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          mode: form.mode,
          weightKg: form.weightKg,
          volumeCbm: form.volumeCbm,
          incoterms: form.incoterms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Routing failed");
      setRoutes(data.routes as RouteRecommendation[]);
    } catch (e) {
      setRoutingError(e instanceof Error ? e.message : "Routing failed");
    } finally {
      setRoutingLoading(false);
    }
  }

  async function submit(route: RouteRecommendation | null) {
    setSubmitting(true);
    setSubmitError(null);
    const result = await createBooking(form, route);
    setSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.error ?? "Booking failed");
      return;
    }
    router.push(`/tracking?shipment=${result.shipmentId}`);
  }

  const canRoute =
    form.origin.trim() && form.destination.trim() && !routingLoading;
  const canBook = form.clientName.trim() && form.origin.trim() && form.destination.trim();

  const field =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500";
  const label = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <div className="space-y-6">
      {/* Booking form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={label}>Client name</label>
            <input className={field} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Jollibee Foods Logistics" />
          </div>
          <div>
            <label className={label}>PO number</label>
            <input className={field} value={form.poNumber} onChange={(e) => set("poNumber", e.target.value)} placeholder="PO-MNL-99420" />
          </div>
          <div>
            <label className={label}>Shipper</label>
            <input className={field} value={form.shipper} onChange={(e) => set("shipper", e.target.value)} placeholder="Davao Agri Exports Co." />
          </div>
          <div>
            <label className={label}>Consignee</label>
            <input className={field} value={form.consignee} onChange={(e) => set("consignee", e.target.value)} placeholder="Manila North Harbor Whse" />
          </div>
          <div>
            <label className={label}>Origin</label>
            <input className={field} value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Davao Port (PHDVO)" />
          </div>
          <div>
            <label className={label}>Destination</label>
            <input className={field} value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Manila Port (PHMNL)" />
          </div>
          <div>
            <label className={label}>Transport mode</label>
            <select className={field} value={form.mode} onChange={(e) => set("mode", e.target.value as TransportMode)}>
              {TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Cargo type</label>
            <input className={field} value={form.cargoType} onChange={(e) => set("cargoType", e.target.value)} placeholder="FCL 40HQ / LCL / Domestic Truck" />
          </div>
          <div>
            <label className={label}>Weight (kg)</label>
            <input type="number" className={field} value={form.weightKg || ""} onChange={(e) => set("weightKg", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Volume (CBM)</label>
            <input type="number" className={field} value={form.volumeCbm || ""} onChange={(e) => set("volumeCbm", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Incoterms</label>
            <select className={field} value={form.incoterms} onChange={(e) => set("incoterms", e.target.value)}>
              {["FOB", "CIF", "DDP", "DAP", "EXW", "FCA"].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Hazard class</label>
            <input className={field} value={form.hazardClass} onChange={(e) => set("hazardClass", e.target.value)} placeholder="None / Class 9" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-slate-100">
          <button
            onClick={runAiRouting}
            disabled={!canRoute}
            className="bg-gradient-to-r from-pink-600 to-rose-500 hover:opacity-90 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center gap-2 transition-all"
          >
            {routingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate AI Route Recommendations
          </button>
          <button
            onClick={() => submit(null)}
            disabled={!canBook || submitting}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Book without route
          </button>
          {!aiEnabled && (
            <span className="text-[11px] text-amber-600">
              AI provider not configured — set GROQ_API_KEY or GEMINI_API_KEY.
            </span>
          )}
          {submitError && (
            <span className="text-[11px] text-rose-600">{submitError}</span>
          )}
        </div>
      </div>

      {/* AI results */}
      {routingError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-4 py-3">
          {routingError}
        </div>
      )}

      {routes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((r, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{r.routeName}</h4>
                  <p className="text-xs text-slate-500">{r.carrierName}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riskTone(r.riskScore)}`}>
                  {r.riskScore} risk
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {r.transitTimeDays}d transit
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <PhilippinePeso className="w-3.5 h-3.5 text-slate-400" /> {formatCurrency(r.estimatedCostPHP)}
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Leaf className="w-3.5 h-3.5 text-emerald-500" /> {r.co2ReductionPercent}% CO₂
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> {r.riskScore}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug flex-1">{r.keyAdvantage}</p>

              <button
                onClick={() => submit(r)}
                disabled={!canBook || submitting}
                className="mt-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Book this route <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
