"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import type { IntakeRow } from "@/lib/stats";

const COLORS = ["#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export default function VolumeChart({ data }: { data: IntakeRow[] }) {
  const dark = useDark();

  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No intake volume yet"
        description="Parcel-per-platform trends appear here once parcels are intaken."
      />
    );
  }

  const platforms = Object.keys(data[0]).filter((k) => k !== "month");

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: dark ? "#1e293b" : "#0f172a",
              borderRadius: "8px",
              color: "#fff",
              border: "none",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {platforms.map((p, i) => (
            <Bar key={p} dataKey={p} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}