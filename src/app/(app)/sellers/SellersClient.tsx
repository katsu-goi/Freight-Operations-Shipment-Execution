"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  Building2,
} from "lucide-react";
import type { SellerAdminRow } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import {
  createSellerAccount,
  updateSeller,
  archiveSeller,
  restoreSeller,
  deleteSellerPermanently,
} from "./actions";

const inputCls =
  "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all";
const labelCls =
  "block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1";

type DialogState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; seller: SellerAdminRow }
  | { kind: "archive"; seller: SellerAdminRow }
  | { kind: "restore"; seller: SellerAdminRow }
  | { kind: "delete"; seller: SellerAdminRow };

const PAGE_SIZE = 10;

export default function SellersClient({ sellers }: { sellers: SellerAdminRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "Active" | "Archived">("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sellers.filter((s) => {
      if (statusFilter === "Active" && s.archived) return false;
      if (statusFilter === "Archived" && !s.archived) return false;
      if (!term) return true;
      return [s.name, s.business_name, s.email, s.reference, s.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [sellers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = sellers.filter((s) => !s.archived).length;
  const archivedCount = sellers.length - activeCount;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setFormError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(successMsg);
        setDialog({ kind: "none" });
        router.refresh();
      } else {
        if (dialog.kind === "add" || dialog.kind === "edit") {
          setFormError(res.error ?? "Update failed");
        } else {
          toast.error(res.error ?? "Action failed");
          setDialog({ kind: "none" });
        }
      }
    });
  }

  function menuFor(seller: SellerAdminRow): ActionMenuItem[] {
    return [
      {
        label: "View",
        onSelect: () => router.push(`/parcels?seller=${seller.id}`),
      },
      {
        label: "Edit",
        onSelect: () => {
          setFormError(null);
          setDialog({ kind: "edit", seller });
        },
      },
      seller.archived
        ? {
            label: "Restore",
            onSelect: () => setDialog({ kind: "restore", seller }),
          }
        : {
            label: "Archive",
            onSelect: () => setDialog({ kind: "archive", seller }),
          },
      {
        label: "Delete Permanently",
        danger: true,
        onSelect: () => setDialog({ kind: "delete", seller }),
      },
    ];
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administration"
        title="Seller Management"
        description="Business clients sending parcels through the network."
        actions={
          <button
            onClick={() => {
              setFormError(null);
              setDialog({ kind: "add" });
            }}
            className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Seller
          </button>
        }
      />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <SummaryChip label="Total Sellers" value={sellers.length} />
        <SummaryChip label="Active" value={activeCount} tone="emerald" />
        <SummaryChip label="Archived" value={archivedCount} tone="slate" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search sellers..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            aria-label="Filter by account status"
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search || statusFilter ? "No sellers found" : "No sellers yet"}
            description={
              search || statusFilter
                ? "No sellers match your current filters."
                : "Add your first seller to start registering parcels under their account."
            }
            action={
              !(search || statusFilter) ? (
                <button
                  onClick={() => setDialog({ kind: "add" })}
                  className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline"
                >
                  + Add Seller
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[52rem]">
                <thead>
                  <tr className="text-left text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 font-bold">Seller</th>
                    <th className="px-5 py-3 font-bold">Business</th>
                    <th className="px-5 py-3 font-bold">Contact</th>
                    <th className="px-5 py-3 font-bold">Parcels</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Added</th>
                    <th className="px-5 py-3 font-bold">Last Activity</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {paged.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        s.archived ? "opacity-70" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{s.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{s.reference}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {s.business_name ?? "—"}
                        {s.address && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">{s.address}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        <div>{s.email ?? "—"}</div>
                        <div className="text-[10px] text-slate-400">{s.phone ?? ""}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-black text-slate-700 dark:text-slate-200">
                          {s.parcelCount}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <AccountStatusBadge archived={s.archived} />
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(s.last_activity_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ActionMenu items={menuFor(s)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium">
                  Page {safePage} of {totalPages} · {filtered.length} sellers
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Prev
                  </button>
                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- Dialogs ---------- */}

      {(dialog.kind === "add" || dialog.kind === "edit") && (
        <Modal
          open
          wide
          onClose={() => setDialog({ kind: "none" })}
          title={dialog.kind === "add" ? "Add Seller" : `Edit ${dialog.seller.name}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              // FormData.get() yields null for absent inputs; coerce to ""
              // so the string schemas never receive a null.
              const val = (key: string) => String(fd.get(key) ?? "");
              if (dialog.kind === "add") {
                run(
                  () =>
                    createSellerAccount({
                      name: val("name"),
                      businessName: val("businessName"),
                      contactPerson: val("contactPerson"),
                      phone: val("phone"),
                      email: val("email"),
                      address: val("address"),
                      pickupFrequency: val("pickupFrequency"),
                      password: val("password"),
                    }),
                  "Seller account created",
                );
              } else {
                run(
                  () =>
                    updateSeller({
                      sellerId: dialog.seller.id,
                      name: val("name"),
                      businessName: val("businessName"),
                      contactPerson: val("contactPerson"),
                      phone: val("phone"),
                      email: val("email"),
                      address: val("address"),
                      pickupFrequency: val("pickupFrequency"),
                      notes: val("notes") || dialog.seller.notes || "",
                    }),
                  "Seller updated",
                );
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={dialog.kind === "edit" ? dialog.seller.name : ""}
                  className={inputCls}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className={labelCls}>Business / Company</label>
                <input
                  name="businessName"
                  defaultValue={dialog.kind === "edit" ? dialog.seller.business_name ?? "" : ""}
                  className={inputCls}
                  placeholder="Doe Trading Co."
                />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={dialog.kind === "edit" ? dialog.seller.email ?? "" : ""}
                  className={inputCls}
                  placeholder="john@doetrading.com"
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  name="phone"
                  defaultValue={dialog.kind === "edit" ? dialog.seller.phone ?? "" : ""}
                  className={inputCls}
                  placeholder="+63 917 000 0000"
                />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input
                  name="contactPerson"
                  defaultValue={dialog.kind === "edit" ? dialog.seller.contact_person ?? "" : ""}
                  className={inputCls}
                  placeholder="M. Tan"
                />
              </div>
              <div>
                <label className={labelCls}>Pickup Frequency</label>
                <select
                  name="pickupFrequency"
                  defaultValue={dialog.kind === "edit" ? dialog.seller.pickup_frequency ?? "On-demand" : "On-demand"}
                  className={inputCls}
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>On-demand</option>
                </select>
              </div>
              {dialog.kind === "add" && (
                <div>
                  <label className={labelCls}>Temporary Password *</label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className={inputCls}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Stored securely by Supabase Auth (never in plaintext). Share with the seller via a safe channel.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Address</label>
              <input
                name="address"
                defaultValue={dialog.kind === "edit" ? dialog.seller.address ?? "" : ""}
                className={inputCls}
                placeholder="123 Main St., Malolos, Bulacan"
              />
            </div>

            {dialog.kind === "edit" && (
              <div>
                <label className={labelCls}>Notes</label>
                <textarea name="notes" rows={2} defaultValue={dialog.seller.notes ?? ""} className={inputCls} />
              </div>
            )}

            {formError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDialog({ kind: "none" })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {dialog.kind === "add" ? "Create Seller" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog.kind === "archive" && (
        <Modal
          open
          onClose={() => setDialog({ kind: "none" })}
          title="Archive Seller"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to archive{" "}
              <strong>{dialog.seller.name}</strong>?
              <br />
              <br />
              The seller will no longer be able to access normal seller
              functions, but their parcel and tracking history will be
              preserved.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDialog({ kind: "none" })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={pending}
                onClick={() =>
                  run(() => archiveSeller({ sellerId: dialog.seller.id }), "Seller archived")
                }
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition-all"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Archive className="w-3.5 h-3.5" />
                Archive Seller
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dialog.kind === "restore" && (
        <Modal
          open
          onClose={() => setDialog({ kind: "none" })}
          title="Restore Seller"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Restore <strong>{dialog.seller.name}</strong>? Their login account
              is re-enabled and they can immediately resume parcel operations.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDialog({ kind: "none" })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={pending}
                onClick={() =>
                  run(() => restoreSeller({ sellerId: dialog.seller.id }), "Seller restored")
                }
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <ArchiveRestore className="w-3.5 h-3.5" />
                Restore Seller
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dialog.kind === "delete" && (
        <Modal
          open
          onClose={() => setDialog({ kind: "none" })}
          title="Delete Seller Permanently"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-slate-700 dark:text-slate-200 space-y-1">
              <p className="font-black text-rose-700 dark:text-rose-400">
                This action cannot be undone.
              </p>
              <p>Seller: {dialog.seller.name}</p>
              <p>Associated Parcels: {dialog.seller.parcelCount}</p>
              {dialog.seller.parcelCount > 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400 pt-1">
                  This seller still owns parcels with tracking history — deletion
                  is blocked to preserve records. Archive instead.
                </p>
              )}
            </div>

            <ConfirmDeleteBody
              pending={pending}
              onCancel={() => setDialog({ kind: "none" })}
              onDelete={() =>
                run(
                  () => deleteSellerPermanently({
                    sellerId: dialog.seller.id,
                    confirmText: "DELETE",
                  }),
                  "Seller permanently deleted",
                )
              }
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Typed-DELETE confirmation footer for the permanent delete dialog. */
function ConfirmDeleteBody({
  pending,
  onCancel,
  onDelete,
}: {
  pending: boolean;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [typed, setTyped] = useState("");
  const blocked = typed.trim() !== "DELETE";
  return (
    <>
      <div>
        <label className={labelCls}>
          Type <span className="font-mono font-black text-rose-600">DELETE</span> to confirm
        </label>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={inputCls}
          placeholder="DELETE"
          autoComplete="off"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          disabled={pending || blocked}
          onClick={onDelete}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <Trash2 className="w-3.5 h-3.5" />
          Delete Permanently
        </button>
      </div>
    </>
  );
}

function AccountStatusBadge({ archived }: { archived: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        archived
          ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          archived ? "bg-slate-400" : "bg-emerald-500"
        }`}
        aria-hidden
      />
      {archived ? "Archived" : "Active"}
    </span>
  );
}

function SummaryChip({
  label,
  value,
  tone = "pink",
}: {
  label: string;
  value: number;
  tone?: "pink" | "emerald" | "slate";
}) {
  const tones = {
    pink: "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300",
    emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold ${tones[tone]}`}
    >
      {label}: {value}
    </span>
  );
}
