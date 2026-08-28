"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, Ship, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppRole } from "@/types";

import RealtimeIndicator from "./RealtimeIndicator";
import SidebarNav from "./SidebarNav";

// ---------------------------------------------------------------------------
// Public contracts — strict, no `any`
// ---------------------------------------------------------------------------
export interface SidebarProps {
  /** Authenticated user role (RBAC). */
  role: AppRole;
  /** Number of carrier batches not yet handed over (manifest badge). */
  pendingBatchCount: number;
  /** Unread notification count for the bell. */
  unreadNotifications?: number;
}

interface BrandProps {
  readonly role: AppRole;
}

interface RoleBadgeProps {
  readonly role: AppRole;
}

// ---------------------------------------------------------------------------
// Airship Express — Subsystem V3.1 Sidebar
// ---------------------------------------------------------------------------
// Design decisions:
// - Navigation links (Dashboard, Parcels, Track) use a soft accent: left border
//   + muted bg, not a solid pink fill, so the active state is discoverable
//   but not visually competing with the CTA.
// - Create Parcel is a `variant: "cta"` and renders as a full-width primary
//   button (gradient, shadow, + icon). It lives in SidebarNav, not as a nav row.
// - Dual highlight is fixed via longest-match active detection (usePathname +
//   sorted href length) so only one of /parcels and /parcels/new is ever active.
// - Admin modules use a controlled accordion (useState<Record<id,boolean>>)
//   with Tailwind grid-rows animation — no Radix/shadcn dependency required,
//   but the markup is forwards-compatible (aria-expanded, aria-controls).
// ---------------------------------------------------------------------------
export default function Sidebar({
  role,
  pendingBatchCount,
  unreadNotifications = 0,
}: SidebarProps): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const pathname = usePathname();

  const openMobile = useCallback((): void => setMobileOpen(true), []);
  const closeMobile = useCallback((): void => setMobileOpen(false), []);

  // Auto-close drawer on navigation — ensures content is visible after tap
  useEffect((): void => {
    setMobileOpen(false);
  }, [pathname]);

  // ESC closes mobile drawer (a11y)
  useEffect((): (() => void) | void => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return (): void => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger — hidden on lg+ where sidebar is persistent */}
      <button
        type="button"
        onClick={openMobile}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
        className="lg:hidden fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-slate-900 text-white shadow-lg ring-1 ring-slate-800 hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" aria-hidden />
      </button>

      {/* Desktop — persistent, sticky full-height */}
      <aside
        aria-label="Primary navigation"
        className="hidden lg:flex w-72 bg-slate-900 text-slate-300 flex-col shrink-0 shadow-2xl z-20 h-screen sticky top-0 border-r border-slate-800"
      >
        <Brand role={role} />
        <RoleBadge role={role} />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <SidebarNav
            role={role}
            pendingBatchCount={pendingBatchCount}
            unreadNotifications={unreadNotifications}
          />
        </div>
        <RealtimeIndicator />
      </aside>

      {/* Mobile drawer — overlay + slide-in panel */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
          onClick={closeMobile}
          aria-hidden
        />

        {/* Panel */}
        <aside
          id="mobile-sidebar"
          aria-label="Mobile navigation"
          className={cn(
            "absolute left-0 top-0 h-full w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl overflow-hidden border-r border-slate-800 transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between pr-3 shrink-0">
            <Brand role={role} />
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>

          <RoleBadge role={role} />

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <SidebarNav
              role={role}
              pendingBatchCount={pendingBatchCount}
              unreadNotifications={unreadNotifications}
            />
          </div>

          <RealtimeIndicator />
        </aside>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — typed, single-responsibility
// ---------------------------------------------------------------------------

function Brand({ role: _role }: BrandProps): React.JSX.Element {
  return (
    <div className="p-5 border-b border-slate-800 flex items-center gap-3 shrink-0">
      <div className="bg-gradient-to-tr from-pink-600 to-rose-500 p-2.5 rounded-xl shadow-lg shadow-pink-500/20 text-white ring-1 ring-white/10">
        <Ship className="w-6 h-6 stroke-[2.5]" aria-hidden />
      </div>
      <div className="min-w-0">
        <h1 className="font-bold text-white text-[15px] tracking-wide leading-none">
          Airship<span className="text-pink-500 font-black ml-1">Express</span>
        </h1>
        <span className="mt-1 inline-block text-[10px] uppercase tracking-widest text-pink-300 font-semibold bg-pink-950/50 px-1.5 py-0.5 rounded border border-pink-900/50">
          Subsystem v3.1
        </span>
      </div>
    </div>
  );
}

function RoleBadge({ role }: RoleBadgeProps): React.JSX.Element {
  return (
    <div className="px-4 py-3 bg-slate-950/30 border-b border-slate-800/80 shrink-0">
      <div className="flex items-center gap-2.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 shadow-sm">
        <span className="p-1.5 rounded-lg bg-slate-700/60 border border-slate-600/50">
          <ShieldCheck className="w-3.5 h-3.5 text-pink-400" aria-hidden />
        </span>
        <span className="text-xs font-semibold text-white tracking-wide truncate">
          {role}
        </span>
        <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          Role
        </span>
      </div>
    </div>
  );
}
