"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Sparkles, LogOut, Loader2 } from "lucide-react";
import type { Profile } from "@/types";
import { signOut } from "@/app/login/actions";

export default function Header({
  profile,
  aiEnabled,
}: {
  profile: Profile;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [pending, startTransition] = useTransition();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (q) router.push(`/tracking?q=${encodeURIComponent(q)}`);
  }

  const initials = (profile.full_name ?? profile.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
      <form onSubmit={onSearch} className="relative w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search Shipment ID, PO #, Container or Client..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
        />
      </form>

      <div className="flex items-center space-x-4">
        <div
          className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            aiEnabled
              ? "bg-pink-50 border-pink-200 text-pink-700"
              : "bg-slate-50 border-slate-200 text-slate-400"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{aiEnabled ? "AI Engine Enabled" : "AI Engine Offline"}</span>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center border-2 border-pink-500 shadow-sm">
            {initials}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-slate-800 leading-none">
              {profile.full_name ?? profile.email}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {profile.role} Access Level
            </div>
          </div>

          <button
            onClick={() => startTransition(() => signOut())}
            title="Sign out"
            className="ml-1 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
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
