"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export interface ConfirmDialogProps {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary" | "warning";
  /** Require typing an exact word (e.g. DELETE) before confirming. */
  confirmWord?: string;
  /** Async action; throw/return false to keep dialog open on failure. */
  onConfirm: () => Promise<boolean | void>;
}

/**
 * Confirmation dialog for destructive actions.
 * With `confirmWord`, the admin must type the exact word (e.g. DELETE).
 */
export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  confirmWord,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const toneClasses =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
      : tone === "warning"
        ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
        : "bg-pink-600 hover:bg-pink-500 shadow-pink-600/30";

  const blocked = !!confirmWord && typed.trim() !== confirmWord;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      let okResult = true;
      try {
        const res = await onConfirm();
        if (res === false) okResult = false;
      } catch (e) {
        okResult = false;
        toast.error(e instanceof Error ? e.message : "Action failed");
      }
      if (okResult) {
        setOpen(false);
        setTyped("");
      }
    });
  }

  return (
    <>
      {trigger(() => {
        setTyped("");
        setError(null);
        setOpen(true);
      })}
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title}>
        <div className="space-y-4">
          {description && (
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {description}
            </div>
          )}

          {confirmWord && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Type <span className="font-mono font-black text-rose-600">{confirmWord}</span> to confirm
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder={confirmWord}
                autoComplete="off"
              />
              {blocked && typed.length > 0 && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Confirmation word does not match yet.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={pending || blocked}
              className={`inline-flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-60 ${toneClasses}`}
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
