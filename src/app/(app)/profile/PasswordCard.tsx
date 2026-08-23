"use client";

import { useState, useTransition } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { changePassword } from "@/app/(app)/notifications/actions";
import { useToast } from "@/components/ui/Toast";

export default function PasswordCard() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    const password = String(formData.get("password") ?? "");
    startTransition(async () => {
      const res = await changePassword({ password });
      if (res.ok) toast.success("Password updated");
      else setError(res.error);
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-3"
    >
      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-pink-600" />
        Change Password
      </h3>
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="New password (min. 8 characters)"
        autoComplete="new-password"
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
      />
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all"
      >
        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Update Password
      </button>
    </form>
  );
}
