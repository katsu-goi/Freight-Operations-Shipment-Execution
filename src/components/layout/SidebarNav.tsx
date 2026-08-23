"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { visibleNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types";

/** Shared nav list; rendered in the desktop sidebar and the mobile drawer. */
export default function SidebarNav({
  role,
  pendingBatchCount,
  unreadNotifications = 0,
}: {
  role: AppRole;
  pendingBatchCount: number;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const items = visibleNav(role);

  return (
    <nav className="p-3 space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={cn(
              "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all",
              active
                ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white",
            )}
          >
            <span className="flex items-center space-x-3">
              <Icon
                className={cn(
                  "w-4 h-4",
                  item.badge?.kind === "live" && "text-pink-400",
                )}
              />
              <span>{item.label}</span>
            </span>

            {item.badge?.kind === "ai" && (
              <span className="bg-pink-500/20 text-pink-300 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                AI
              </span>
            )}
            {item.badge?.kind === "live" && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                LIVE
              </span>
            )}
            {item.badge?.kind === "count" && pendingBatchCount > 0 && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                {pendingBatchCount}
              </span>
            )}
            {item.href === "/notifications" && unreadNotifications > 0 && (
              <span className="bg-pink-600 text-white text-[10px] font-black min-w-5 text-center px-1.5 py-0.5 rounded-full">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
            {!item.badge && item.href !== "/notifications" && active && (
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
