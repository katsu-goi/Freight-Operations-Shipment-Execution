"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { createSeller } from "./actions";

const INITIAL = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  pickupFrequency: "On-demand",
};

export default function SellerForm() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const res = await createSeller(form);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to register seller");
      return;
    }
    setSuccess(`Seller ${res.value.reference} registered.`);
    setForm(INITIAL);
    router.refresh();
  }

  const field =
    "w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500";
  const label = "block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1";

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
    >
      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-pink-500" /> Register Seller
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className={label}>Seller name *</label>
          <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Luzon Merchants Co." />
        </div>
        <div>
          <label className={label}>Contact person</label>
          <input className={field} value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0917 123 4567" />
        </div>
        <div>
          <label className={label}>Email</label>
          <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className={label}>Pickup frequency</label>
          <select className={field} value={form.pickupFrequency} onChange={(e) => set("pickupFrequency", e.target.value)}>
            {["On-demand", "Daily", "2x per week", "Weekly"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={label}>Address</label>
        <input className={field} value={form.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
      {success && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {success}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !form.name.trim()}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {submitting ? "Saving…" : "Add seller"}
      </button>
    </form>
  );
}