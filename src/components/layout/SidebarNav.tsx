"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  visibleNav,
  SETTINGS_MENU_HREFS,
  NAV_GROUPS,
  GROUPED_HREFS,
  NAV_ITEMS,
} from "@/lib/nav";
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

  // Flat items: visible for role, excluding settings menu & grouped hrefs
  const flatItems = visibleNav(role).filter(
    (item) =>
      !SETTINGS_MENU_HREFS.includes(item.href) &&
      !GROUPED_HREFS.includes(item.href),
  );

  // Resolve groups visible for this role with their resolved NavItems
  const groups = NAV_GROUPS.map((group) => {
    const items = group.hrefs
      .map((href) => NAV_ITEMS.find((n) => n.href === href))
      .filter(
        (i): i is NonNullable<typeof i> =>
          !!i && (i.roles.length === 0 || i.roles.includes(role)),
      );
    return { ...group, items };
  }).filter((g) => g.items.length > 0 && (g.roles.length === 0 || g.roles.includes(role)));

  // Track open state per group. Auto-open if child route is active.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      const active = g.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
      );
      init[g.id] = active;
    }
    return init;
  });

  // Keep groups auto-expanded when navigating to a child route
  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const g of groups) {
        const isActive = g.items.some(
          (item) =>
            pathname === item.href || pathname.startsWith(item.href + "/"),
        );
        if (isActive && !prev[g.id]) {
          next[g.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className="p-3 space-y-5 overflow-y-auto scroll-thin flex-1 min-h-0">
      {/* ---------- Flat / top-level items ---------- */}
      <div className="space-y-1">
        {flatItems.map((item) => {
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
            </Link>
          );
        })}
      </div>

      {/* ---------- Grouped dropdowns (Admin only) ---------- */}
      {groups.length > 0 && (
        <>
          <div className="border-t border-slate-800/70" />
          <div className="space-y-3">
            <p className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Admin Modules
            </p>
            {groups.map((group) => {
              const isOpen = !!openGroups[group.id];
              const GroupIcon = group.icon;
              const isGroupActive = group.items.some(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/"),
              );
              const groupHasCount =
                pendingBatchCount > 0 &&
                group.items.some((i) => i.badge?.kind === "count");

              return (
                <div
                  key={group.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    isOpen
                      ? "bg-slate-800/40 border-slate-800"
                      : "bg-transparent border-transparent hover:border-slate-800/50",
                    isGroupActive && !isOpen && "border-slate-800 bg-slate-800/30",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`nav-group-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left",
                      isGroupActive
                        ? "text-white"
                        : "text-slate-400 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors shrink-0",
                          isGroupActive
                            ? "bg-pink-600 border-pink-500 text-white shadow-sm"
                            : "bg-slate-800 border-slate-700 text-slate-400 group-hover:text-white",
                        )}
                      >
                        <GroupIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-semibold leading-none truncate">
                          {group.label}
                        </span>
                        {group.description && (
                          <span className="text-[10px] font-normal text-slate-500 leading-none mt-1 truncate">
                            {group.description}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 shrink-0 ml-2">
                      {groupHasCount && !isOpen && (
                        <span className="bg-pink-600 text-white text-[10px] font-bold min-w-5 text-center px-1.5 py-0.5 rounded-full">
                          {pendingBatchCount}
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-500 transition-transform duration-200",
                          isOpen && "rotate-180 text-slate-300",
                        )}
                      />
                    </span>
                  </button>

                  {/* Collapsible children */}
                  <div
                    id={`nav-group-${group.id}`}
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 pointer-events-none",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-2 pb-2 pt-1 space-y-1">
                        <div className="ml-2 pl-3 border-l border-slate-700/60 space-y-1">
                          {group.items.map((item) => {
                            const active =
                              pathname === item.href ||
                              pathname.startsWith(item.href + "/");
                            const Icon = item.icon;
                            return (
                              <Link
                                key={`${group.id}-${item.href}-${item.label}`}
                                href={item.href}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-all",
                                  active
                                    ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                                    : "text-slate-400 hover:bg-slate-700/60 hover:text-white",
                                )}
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                </span>
                                {item.badge?.kind === "count" &&
                                  pendingBatchCount > 0 && (
                                    <span
                                      className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0",
                                        active
                                          ? "bg-white/20 text-white"
                                          : "bg-slate-700 text-slate-300",
                                      )}
                                    >
                                      {pendingBatchCount}
                                    </span>
                                  )}
                                {active && !item.badge && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}
