"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/** Accessible slide-over/scale-in modal with backdrop. */
export default function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full max-w-[calc(100vw-1.5rem)] ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        } max-h-[min(90dvh,900px)] overflow-y-auto scroll-thin bg-white dark:bg-slate-900 rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl border border-slate-200 dark:border-slate-800`}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight min-w-0 break-words">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="touch-target shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
