"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ship, ShieldCheck, ChevronRight } from "lucide-react";
import { visibleNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types";
import RealtimeIndicator from "./RealtimeIndicator";

export default function Sidebar({
  role,
  containerCount,
}: {
  role: AppRole;
  containerCount: number;
}) {
  const pathname = usePathname();
  const items = visibleNav(role);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 shadow-2xl z-20">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-pink-600 to-rose-500 p-2.5 rounded-xl shadow-lg shadow-pink-500/20 text-white">
            <Ship className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-wide">
              Airship<span className="text-pink-500 font-black ml-1">Express</span>
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-pink-400 font-semibold bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-800/50">
              Subsystem v3.1
            </span>
          </div>
        </div>

        {/* Role badge */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800/80">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Access Role (RBAC)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="w-full bg-slate-800 text-xs font-semibold text-white py-2 px-3 rounded-lg border border-slate-700">
            {role}
          </div>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-1">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
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
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                    LIVE
                  </span>
                )}
                {item.badge?.kind === "count" && (
                  <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                    {containerCount}
                  </span>
                )}
                {!item.badge && active && (
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <RealtimeIndicator />
    </aside>
  );
}
