import { Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { listCustomers } from "@/lib/repos/customers";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers — Airship Express" };

const PAGE_SIZE = 20;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission("customers.view");
  const { page: pageParam } = await searchParams;
  const all = await listCustomers();
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const paged = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Administration"
        title="Customers"
        description="Recipient accounts and their assigned parcels."
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Customer accounts appear here once recipients register or are assigned parcels."
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 font-bold">Customer</th>
                    <th className="px-5 py-3 font-bold">Email</th>
                    <th className="px-5 py-3 font-bold">Role</th>
                    <th className="px-5 py-3 font-bold">Parcels</th>
                    <th className="px-5 py-3 font-bold">Active</th>
                    <th className="px-5 py-3 font-bold">Delivered</th>
                    <th className="px-5 py-3 font-bold">Joined</th>
                    <th className="px-5 py-3 font-bold">Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {paged.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-100">
                        {c.full_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.email ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          {c.role === "Customer" ? "CUSTOMER" : c.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/parcels?customer=${c.id}`} className="font-black text-pink-600 dark:text-pink-400 hover:underline">
                          {c.parcelCount}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{c.activeCount}</td>
                      <td className="px-5 py-3 text-slate-600">{c.deliveredCount}</td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {c.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((c) => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {c.full_name ?? "—"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                      {c.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {c.parcelCount} parcel(s) · {c.activeCount} active · {c.deliveredCount} delivered
                  </p>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={all.length}
              basePath="/customers"
              params={{}}
            />
          </>
        )}
      </div>
    </div>
  );
}
