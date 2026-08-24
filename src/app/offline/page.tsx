import { WifiOff, Radar, Package } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Offline — Airship Express" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <WifiOff className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          You&apos;re Offline
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          No internet connection. Cached pages and previously viewed map areas
          are still available — any status updates you queue will sync
          automatically once you&apos;re back online.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/track"
            className="inline-flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all"
          >
            <Radar className="w-4 h-4" />
            Track (cached)
          </Link>
          <Link
            href="/parcels"
            className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
          >
            <Package className="w-4 h-4" />
            My Parcels
          </Link>
        </div>
      </div>
    </div>
  );
}
