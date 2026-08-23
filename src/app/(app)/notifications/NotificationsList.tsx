"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Package } from "lucide-react";
import type { AppNotification } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateTime, statusBadgeClass } from "@/lib/utils";
import { markNotificationsRead } from "./actions";

export default function NotificationsClient({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.is_read).length;

  function mark(id?: string) {
    startTransition(async () => {
      await markNotificationsRead({ notificationId: id, all: !id });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Status changes on your parcels appear here as they happen."
        actions={
          unread > 0 ? (
            <button
              onClick={() => mark()}
              disabled={pending}
              className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read ({unread})
            </button>
          ) : null
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You will be notified when a parcel status changes."
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 transition-colors ${
                  n.is_read ? "" : "bg-pink-50/50 dark:bg-pink-950/20"
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    n.is_read
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      : "bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400"
                  }`}
                >
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500" aria-label="Unread" />
                    )}
                    {n.status && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(n.status)}`}
                      >
                        {n.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    {n.tracking_number && n.parcel_id && (
                      <Link
                        href={`/parcels/${n.parcel_id}`}
                        className="text-[11px] font-mono font-bold text-pink-600 dark:text-pink-400 hover:underline"
                      >
                        {n.tracking_number}
                      </Link>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(n.created_at)}
                    </span>
                    {!n.is_read && (
                      <button
                        onClick={() => mark(n.id)}
                        disabled={pending}
                        className="text-[11px] font-bold text-slate-400 hover:text-pink-600 transition-colors disabled:opacity-60"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
