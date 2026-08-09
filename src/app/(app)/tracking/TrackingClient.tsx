"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Navigation,
  Clock,
  Send,
  Loader2,
  Package,
  Gauge,
} from "lucide-react";
import ModeIcon from "@/components/ui/ModeIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { SHIPMENT_STATUSES } from "@/lib/utils";
import { postLocationUpdate } from "./actions";
import type { Shipment, ShipmentStatus, TrackingLog } from "@/types";

const TrackingMap = dynamic(
  () => import("@/components/tracking/TrackingMap"),
  { ssr: false, loading: () => <div className="h-full w-full bg-slate-200 rounded-2xl animate-pulse" /> },
);

export default function TrackingClient({
  shipments,
  initialShipment,
  initialLogs,
  canPost,
}: {
  shipments: Shipment[];
  initialShipment: Shipment | null;
  initialLogs: TrackingLog[];
  canPost: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialShipment?.id ?? shipments[0]?.id ?? null,
  );
  const [rows, setRows] = useState<Shipment[]>(shipments);
  const [logs, setLogs] = useState<TrackingLog[]>(initialLogs);

  const selected = useMemo(
    () => rows.find((s) => s.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // Realtime: shipment row updates + new tracking logs.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tracking-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shipments" },
        (payload) => {
          const updated = payload.new as Shipment;
          setRows((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shipment_tracking_logs" },
        (payload) => {
          const log = payload.new as TrackingLog;
          if (log.shipment_id === selectedId) {
            setLogs((prev) => [log, ...prev].slice(0, 40));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  // Load logs when switching shipment.
  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    supabase
      .from("shipment_tracking_logs")
      .select("*")
      .eq("shipment_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => setLogs((data ?? []) as TrackingLog[]));
  }, [selectedId]);

  if (shipments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <EmptyState
          icon={Navigation}
          title="No shipments to track"
          description="No active shipments found. Create a booking to start live tracking."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Selector list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Shipment Files</h3>
          <p className="text-xs text-slate-500">{rows.length} tracked</p>
        </div>
        <div className="overflow-y-auto scroll-thin divide-y divide-slate-100">
          {rows.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left px-4 py-3 transition-all ${
                s.id === selectedId ? "bg-pink-50 border-l-2 border-pink-500" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{s.reference}</span>
                <StatusBadge status={s.status} />
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                <ModeIcon mode={s.mode} className="w-3 h-3" />
                {s.origin} → {s.destination}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map + details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm h-80">
          <TrackingMap shipment={selected} />
        </div>

        {selected && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-pink-600" /> {selected.reference}
                  </h3>
                  <p className="text-xs text-slate-500">{selected.tracking_number}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div><div className="text-slate-400 uppercase text-[10px] font-semibold">Carrier</div><div className="font-semibold text-slate-800">{selected.carrier ?? "—"}</div></div>
                <div><div className="text-slate-400 uppercase text-[10px] font-semibold">Vessel</div><div className="font-semibold text-slate-800">{selected.vessel ?? "—"}</div></div>
                <div><div className="text-slate-400 uppercase text-[10px] font-semibold">ETA</div><div className="font-semibold text-slate-800 font-mono">{selected.eta ?? "—"}</div></div>
                <div><div className="text-slate-400 uppercase text-[10px] font-semibold">Location</div><div className="font-semibold text-slate-800">{selected.current_location ?? "—"}</div></div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> Progress</span>
                  <span className="font-mono">{selected.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-600 to-rose-500" style={{ width: `${selected.progress}%` }} />
                </div>
              </div>
            </div>

            {canPost && <LocationUpdateForm shipmentId={selected.id} />}

            {/* Timeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-pink-600" /> Status Timeline
              </h3>
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400">No tracking events yet.</p>
              ) : (
                <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                  {logs.map((log) => (
                    <li key={log.id} className="ml-4">
                      <span className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${
                        log.level === "warning" ? "bg-amber-500" : log.level === "success" ? "bg-emerald-500" : "bg-pink-500"
                      }`} />
                      <p className="text-xs text-slate-800">{log.message}</p>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {log.location ?? "—"} · {new Date(log.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LocationUpdateForm({ shipmentId }: { shipmentId: string }) {
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [progress, setProgress] = useState("");
  const [status, setStatus] = useState<ShipmentStatus | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await postLocationUpdate({
      shipmentId,
      message: message || `Location updated: ${location}`,
      location,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      progress: progress ? Number(progress) : null,
      status: status || null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Failed");
      return;
    }
    setMessage("");
    setLocation("");
    setLat("");
    setLng("");
    setProgress("");
    setStatus("");
  }

  const field = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500";

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4 text-pink-600" /> Post Location Update
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <input className={`${field} col-span-2 md:col-span-3`} placeholder="Message (e.g. Cleared BOC at Manila)" value={message} onChange={(e) => setMessage(e.target.value)} />
        <input className={field} placeholder="Location (e.g. NLEX Exit 15)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className={field} placeholder="Lat (e.g. 14.5995)" value={lat} onChange={(e) => setLat(e.target.value)} />
        <input className={field} placeholder="Lng (e.g. 120.9842)" value={lng} onChange={(e) => setLng(e.target.value)} />
        <input className={field} placeholder="Progress %" value={progress} onChange={(e) => setProgress(e.target.value)} />
        <select className={field} value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
          <option value="">Keep status</option>
          {SHIPMENT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <button onClick={submit} disabled={saving || !location} className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-2">{error}</p>}
    </div>
  );
}
