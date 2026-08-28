"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Sparkles, LogOut, Loader2, Bell } from "lucide-react";
import type { Profile } from "@/types";
import { signOut } from "@/app/login/actions";
import ThemeToggle from "./ThemeToggle";
import SettingsMenu from "./SettingsMenu";

export default function Header({
  profile,
  aiEnabled,
  unreadCount = 0,
}: {
  profile: Profile;
  aiEnabled: boolean;
  unreadCount?: number;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [pending, startTransition] = useTransition();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    // Global parcel search — RLS scopes results to the caller's role.
    if (q) router.push(`/parcels?q=${encodeURIComponent(q)}`);
  }

  const initials = (profile.full_name ?? profile.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pl-16 lg:pl-6 pr-6 flex items-center justify-between shrink-0 shadow-sm z-10">
      <form onSubmit={onSearch} className="relative w-64 lg:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search Parcel Ref, Tracking #, Client or Recipient..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
        />
      </form>

      <div className="flex items-center space-x-4">
        <div
          className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            aiEnabled
              ? "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900 text-pink-700 dark:text-pink-300"
              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{aiEnabled ? "AI Engine Online" : "AI Engine Offline"}</span>
        </div>

        <ThemeToggle />

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/40 transition-all"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-pink-600 text-white text-[9px] font-black flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <SettingsMenu role={profile.role} />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center border-2 border-pink-500 shadow-sm">
            {initials}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
              {profile.full_name ?? profile.email}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {profile.role} Access Level
            </div>
          </div>

          <button
            onClick={() => startTransition(() => signOut())}
            title="Sign out"
            className="ml-1 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
