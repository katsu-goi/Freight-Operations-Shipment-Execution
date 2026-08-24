"use client";

import dynamic from "next/dynamic";
import type { ParcelMapProps } from "./ParcelMap";

/**
 * SSR-disabled lazy boundary: the ~140KB Leaflet library never enters the
 * initial bundle or the server render — it loads only when a parcel with
 * map support is opened.
 */
const ParcelMap = dynamic(() => import("./ParcelMap"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
      <span className="text-xs text-slate-400 font-semibold">Loading map…</span>
    </div>
  ),
});

export default function ParcelMapLazy(props: ParcelMapProps) {
  return <ParcelMap {...props} />;
}