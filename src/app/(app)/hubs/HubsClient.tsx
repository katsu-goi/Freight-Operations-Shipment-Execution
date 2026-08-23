"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Warehouse, Pencil } from "lucide-react";
import type { Hub } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import { useToast } from "@/components/ui/Toast";
import { createHub, updateHub } from "./actions";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all";
const labelCls =
  "block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1";

export default function HubsClient({
  hubs,
  counts,
}: {
  hubs: Hub[];
  /** hub id → parcels currently located there */
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Hub | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    const payload = {
      name: String(formData.get("name") ?? ""),
      code: String(formData.get("code") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      province: String(formData.get("province") ?? ""),
      contact: String(formData.get("contact") ?? ""),
    };
    startTransition(async () => {
      const res =
        editing === "new"
          ? await createHub(payload)
          : editing
            ? await updateHub({ ...payload, hubId: editing.id })
            : { ok: false as const, error: "Nothing to save" };
      if (res.ok) {
        toast.success(editing === "new" ? "Hub created" : "Hub updated");
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function menuFor(hub: Hub): ActionMenuItem[] {
    return [
      { label: "Edit", onSelect: () => { setError(null); setEditing(hub); } },
    ];
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Facilities"
        title="Hubs / Facilities"
        description="Physical facilities parcels move through. Parcels are associated with a facility for event-based location tracking."
        actions={
          <button
            onClick={() => { setError(null); setEditing("new"); }}
            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Hub
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {hubs.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No hubs yet"
            description="Add your first sorting or distribution facility."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {hubs.map((h) => (
              <div key={h.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{h.name}</span>
                    {h.code && (
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                        {h.code}
                      </span>
                    )}
                    {!h.is_active && (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {[h.address, h.city, h.province].filter(Boolean).join(", ") || "No address"}
                  </p>
                  {h.contact && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{h.contact}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {counts[h.id] ?? 0} parcel{((counts[h.id] ?? 0) === 1) ? "" : "s"}
                  </span>
                  <ActionMenu items={menuFor(h)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing === "new" ? "Add Hub" : `Edit ${editing.name}`}
        >
          <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Hub Name *</label>
                <input name="name" required minLength={2} defaultValue={editing !== "new" ? editing.name : ""} className={inputCls} placeholder="Malolos Distribution Hub" />
              </div>
              <div>
                <label className={labelCls}>Code</label>
                <input name="code" defaultValue={editing !== "new" ? editing.code ?? "" : ""} className={inputCls} placeholder="HUB-MAL" />
              </div>
              <div>
                <label className={labelCls}>Contact</label>
                <input name="contact" defaultValue={editing !== "new" ? editing.contact ?? "" : ""} className={inputCls} placeholder="+63 44 000 0000" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <input name="address" defaultValue={editing !== "new" ? editing.address ?? "" : ""} className={inputCls} placeholder="McArthur Hwy, Malolos" />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input name="city" defaultValue={editing !== "new" ? editing.city ?? "" : ""} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Province</label>
                <input name="province" defaultValue={editing !== "new" ? editing.province ?? "" : ""} className={inputCls} />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all">
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing === "new" ? <Plus className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                {editing === "new" ? "Create Hub" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
