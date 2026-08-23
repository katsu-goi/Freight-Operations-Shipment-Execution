import Link from "next/link";
import { Package, Plus, MapPin, Clock } from "lucide-react";
import { requireProfile, isStaffRole, isSellerRole } from "@/lib/auth";
import { canCreateParcels } from "@/lib/rbac";
import { listParcels } from "@/lib/repos/parcels";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import ParcelFilters from "@/components/parcels/ParcelFilters";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parcels — Airship Express" };

export default async function ParcelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const param = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };
  const page = Number(param("page") ?? "1") || 1;
  const q = param("q");
  const status = param("status");
  // Staff can scope the list to one seller's or customer's account.
  const sellerFilter =
    isStaffRole(profile.role) ? param("seller") : undefined;
  const customerFilter =
    isStaffRole(profile.role) ? param("customer") : undefined;

  // RLS scopes the rows; staff may additionally filter by seller/customer.
  const result = await listParcels({
    q,
    status,
    sellerId: sellerFilter,
    customerId: customerFilter,
    page,
    pageSize: 20,
    sort: "created_desc",
  });

  const staff = isStaffRole(profile.role);
  const sellerView = isSellerRole(profile.role);
  const canCreate = canCreateParcels(profile.role);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        eyebrow={staff ? "Parcel Management" : "My Shipments"}
        title={sellerView ? "My Parcels" : staff ? "All Parcels" : "My Parcels"}
        description={
          staff
            ? "Every parcel in the system — search, filter and drill into tracking history."
            : "Parcels registered under your account. Click a parcel to see its live tracking timeline."
        }
        actions={
          canCreate ? (
            <Link
              href="/parcels/new"
              className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-pink-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Register Parcel
            </Link>
          ) : null
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <ParcelFilters basePath="/parcels" />

        {result.rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title={q || status || sellerFilter ? "No parcels found" : "No parcels yet"}
            description={
              q || status || sellerFilter
                ? "There are currently no parcels matching your search."
                : canCreate
                  ? "Register your first parcel to start tracking it through the network."
                  : "Parcels assigned to you will appear here once a seller or the hub registers one."
            }
            action={
              q || status || sellerFilter ? (
                <Link
                  href="/parcels"
                  className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline"
                >
                  Clear filters
                </Link>
              ) : canCreate ? (
                <Link
                  href="/parcels/new"
                  className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" /> Register Parcel
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 font-bold">Tracking #</th>
                    {(staff || sellerView) && (
                      <th className="px-5 py-3 font-bold">Recipient</th>
                    )}
                    {staff && <th className="px-5 py-3 font-bold">Seller</th>}
                    <th className="px-5 py-3 font-bold">Destination</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Current Location</th>
                    <th className="px-5 py-3 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {result.rows.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/parcels/${p.id}`}
                          className="font-mono font-bold text-pink-600 dark:text-pink-400 hover:underline"
                        >
                          {p.tracking_number ?? p.reference}
                        </Link>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.consignee}
                        </div>
                      </td>
                      {(staff || sellerView) && (
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                          {p.consignee ?? "—"}
                          {p.destination && (
                            <div className="text-[10px] text-slate-400">
                              → {p.destination}
                            </div>
                          )}
                        </td>
                      )}
                      {staff && (
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                          {p.sellerName ?? (
                            <span className="text-slate-400">Walk-in</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {p.destination}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {p.hubName ?? p.current_location ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {result.rows.map((p) => (
                <Link
                  key={p.id}
                  href={`/parcels/${p.id}`}
                  className="block px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-pink-600 dark:text-pink-400">
                      {p.tracking_number ?? p.reference}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-200 font-semibold">
                    {p.consignee ?? "—"}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.hubName ?? p.current_location ?? "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(p.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              basePath="/parcels"
              params={{ q, status, seller: sellerFilter }}
            />
          </>
        )}
      </div>
    </div>
  );
}
