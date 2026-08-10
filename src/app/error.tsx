"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    console.error("Airship Express error boundary:", error);
    try {
      setDetail(
        `${error.message || "Unknown error"}${error.digest ? ` (digest: ${error.digest})` : ""}`,
      );
    } catch {
      setDetail(null);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md w-full p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-2">
          Something went wrong
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          An unexpected error occurred. If this persists, your session may have
          expired — try signing out and back in.
        </p>
        {detail && (
          <pre className="text-[10px] font-mono text-left bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 mb-4 overflow-x-auto whitespace-pre-wrap break-words text-slate-500 dark:text-slate-400">
            {detail}
          </pre>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold"
          >
            Try again
          </button>
          <a
            href="/login"
            onClick={() => {
              // Hard redirect clears the (possibly stale) cookie session.
              window.location.assign("/login");
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold"
          >
            Sign out &amp; back in
          </a>
        </div>
      </div>
    </div>
  );
}