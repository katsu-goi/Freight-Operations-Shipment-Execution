import { formatDate } from "@/lib/utils";
import type { Handover } from "@/types";

export default function HandoverHistory({ handovers }: { handovers: Handover[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-400">
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <th className="text-left px-5 py-3">Date</th>
            <th className="text-left px-3 py-3">Platform</th>
            <th className="text-left px-3 py-3">Rider</th>
            <th className="text-right px-3 py-3">Parcels</th>
            <th className="text-left px-5 py-3">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {handovers.map((h) => (
            <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                {formatDate(h.handed_over_at)}
              </td>
              <td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">
                {h.platform}
              </td>
              <td className="px-3 py-3">
                <span className="text-slate-700 dark:text-slate-300">{h.rider_name}</span>
                {h.rider_phone && (
                  <span className="block text-[10px] text-slate-400">{h.rider_phone}</span>
                )}
              </td>
              <td className="px-3 py-3 text-right">{h.parcel_count}</td>
              <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{h.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}