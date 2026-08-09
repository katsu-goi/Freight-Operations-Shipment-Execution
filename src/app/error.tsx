"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Airship Express error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md w-full p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-2">
          Something went wrong
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          An unexpected error occurred. If this persists, your session may have
          expired.
        </p>
        <button
          onClick={() => reset()}
          className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}