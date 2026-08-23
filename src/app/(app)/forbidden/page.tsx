import Link from "next/link";
import { ShieldX, LayoutDashboard, ArrowLeft } from "lucide-react";

export const metadata = { title: "Access Denied — Airship Express" };

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-8 text-center">
        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldX className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Access Denied
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          You do not have permission to view this page. Your account role does
          not include access to this area of the system.
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Error 403 · Forbidden
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Track a Parcel
          </Link>
        </div>
      </div>
    </div>
  );
}
