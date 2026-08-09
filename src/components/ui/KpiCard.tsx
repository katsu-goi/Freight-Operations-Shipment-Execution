import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "pink",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "pink" | "blue" | "amber" | "emerald";
}) {
  const toneMap = {
    pink: "bg-pink-50 text-pink-600 group-hover:bg-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  } as const;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-pink-300 dark:hover:border-pink-800 transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{value}</h3>
        </div>
        <div
          className={cn(
            "p-2.5 rounded-xl transition-all group-hover:text-white",
            toneMap[tone],
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {hint && (
        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">{hint}</div>
      )}
    </div>
  );
}
