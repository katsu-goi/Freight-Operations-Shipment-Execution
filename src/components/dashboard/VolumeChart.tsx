"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import EmptyState from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";

type Row = { month: string; Ocean: number; Air: number; Road: number; Rail: number };

export default function VolumeChart({ data }: { data: Row[] }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No volume data yet"
        description="Multimodal volume trends appear here once shipments are booked."
      />
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              color: "#fff",
              border: "none",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="Ocean" fill="#0f172a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Air" fill="#ec4899" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Road" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Rail" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
