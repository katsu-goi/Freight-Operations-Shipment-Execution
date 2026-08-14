"use client";

import { useState } from "react";
import { Ship, ShieldCheck, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types";
import SidebarNav from "./SidebarNav";
import RealtimeIndicator from "./RealtimeIndicator";

export default function Sidebar({
  role,
  pendingBatchCount,
}: {
  role: AppRole;
  pendingBatchCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-slate-900 text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col justify-between shrink-0 shadow-2xl z-20">
        <div>
          <Brand role={role} />
          <RoleBadge role={role} />
          <SidebarNav role={role} pendingBatchCount={pendingBatchCount} />
        </div>
        <RealtimeIndicator />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <div
          className="absolute inset-0 bg-slate-950/70"
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-72 bg-slate-900 text-slate-300 flex flex-col justify-between shadow-2xl transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div>
            <div className="flex items-center justify-between pr-4">
              <Brand role={role} />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <RoleBadge role={role} />
            <SidebarNav role={role} pendingBatchCount={pendingBatchCount} />
          </div>
          <RealtimeIndicator />
        </aside>
      </div>
    </>
  );
}

function Brand({ role: _role }: { role: AppRole }) {
  return (
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
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <div className="p-4 bg-slate-950/50 border-b border-slate-800/80">
      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span>Access Role (RBAC)</span>
        <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
      </div>
      <div className="w-full bg-slate-800 text-xs font-semibold text-white py-2 px-3 rounded-lg border border-slate-700">
        {role}
      </div>
    </div>
  );
}
