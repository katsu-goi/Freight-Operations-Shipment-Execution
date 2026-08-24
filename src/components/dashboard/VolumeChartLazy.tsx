"use client";

import dynamic from "next/dynamic";
import type { IntakeRow } from "@/lib/stats";

/**
 * Recharts adds ~100KB gzipped; it renders below the fold on dashboards so
 * it's loaded lazily after first paint (keeps FCP sub-2s).
 */
const VolumeChart = dynamic(() => import("./VolumeChart"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
  ),
});

export default function VolumeChartLazy(props: { data: IntakeRow[] }) {
  return <VolumeChart {...props} />;
}
