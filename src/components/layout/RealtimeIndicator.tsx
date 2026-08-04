"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Footer indicator that reflects the live Supabase Realtime channel state
 * on the shipment_tracking_logs table.
 */
export default function RealtimeIndicator() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-realtime-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shipment_tracking_logs" },
        () => {},
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-950/40">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Radio
            className={`w-3.5 h-3.5 ${
              connected ? "text-emerald-400 animate-pulse" : "text-slate-600"
            }`}
          />
          Supabase Realtime
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            connected
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {connected ? "ACTIVE" : "OFFLINE"}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        Listening on{" "}
        <span className="font-mono text-slate-400">shipment_tracking_logs</span>{" "}
        stream.
      </p>
    </div>
  );
}
