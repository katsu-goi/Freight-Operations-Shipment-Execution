"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#ec4899", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#14b8a6"];

export function PlatformPie({
  data,
}: {
  data: { platform: string; count: number }[];
}) {
  if (!data.length) return <p className="text-xs text-slate-400">No data.</p>;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="platform" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusBars({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  if (!data.length) return <p className="text-xs text-slate-400">No data.</p>;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 24 }}>
          <XAxis dataKey="status" fontSize={9} tickLine={false} angle={-20} textAnchor="end" height={48} />
          <YAxis fontSize={10} tickLine={false} allowDecimals={false} width={32} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeightTrend({
  data,
}: {
  data: { month: string; kg: number }[];
}) {
  if (!data.length) return <p className="text-xs text-slate-400">No data.</p>;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <XAxis dataKey="month" fontSize={10} tickLine={false} />
          <YAxis fontSize={10} tickLine={false} width={40} />
          <Tooltip />
          <Line type="monotone" dataKey="kg" stroke="#ec4899" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
