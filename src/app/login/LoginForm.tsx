"use client";

import { useState, useActionState, useRef } from "react";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  ShieldAlert,
  ShieldCheck,
  Package,
} from "lucide-react";
import { signIn, signUp, type AuthState } from "./actions";
import type { AppRole } from "@/types";

const REGISTER_ROLES: { role: AppRole; label: string; desc: string }[] = [
  { role: "Seller", label: "Seller Account", desc: "For online merchants dropping off parcels" },
  { role: "Customer", label: "Customer Account", desc: "For parcel recipients tracking deliveries" },
  { role: "Admin", label: "Admin Account", desc: "Full hub & operational privileges" },
];

function SubmitButton({ mode, pending }: { mode: "signin" | "signup"; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#1E3A8A] via-[#1E40A0] to-[#0A245C] hover:from-[#162C6E] hover:to-[#081C48] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-full text-sm shadow-[0_6px_20px_rgba(30,58,138,0.35)] hover:shadow-[0_8px_25px_rgba(30,58,138,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Authenticating...</span>
        </>
      ) : (
        <>
          <span>{mode === "signin" ? "Sign in to Dashboard" : "Create Account"}</span>
          <ArrowRight className="w-4 h-4 text-pink-300" />
        </>
      )}
    </button>
  );
}

export default function LoginForm({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, isActionPending] = useActionState<AuthState, FormData>(action, {});
  const [showPw, setShowPw] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const setCredentials = (email: string, pass: string) => {
    if (emailRef.current) emailRef.current.value = email;
    if (pwRef.current) pwRef.current.value = pass;
  };

  return (
    <div className={`w-full ${compact ? "p-5" : "px-6 sm:px-8 pt-6 sm:pt-7 pb-6"}`}>
      <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-white/60 dark:border-slate-700/60 shadow-[0_24px_64px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex justify-center items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/airship-pink-mark.png"
              alt="Airship Express"
              width={48}
              height={30}
              className="w-12 h-7 object-contain drop-shadow-sm"
            />
            <div className="text-left leading-none">
              <div className="flex items-baseline gap-1">
                <span className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white">
                  AIRSHIP
                </span>
                <span className="text-[13px] font-black tracking-tight text-[#E81B75]">
                  EXPRESS
                </span>
              </div>
              <span className="text-[8px] tracking-[0.22em] font-bold text-slate-500 dark:text-slate-400">
                COURIER HUB
              </span>
            </div>
          </div>

          <h2 className="text-[22px] sm:text-[24px] font-black text-slate-900 dark:text-white tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Sign in to your account to continue.
          </p>
        </div>

        {/* Mode Switcher (Sign In vs Register) */}
        <div className="mt-4 flex gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-full border border-slate-200/80 dark:border-slate-700/80">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 text-xs font-bold py-2 rounded-full transition-all duration-200 cursor-pointer ${
                mode === m
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-200/50 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            >
              {m === "signin" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Quick Demo Login Chips (Admin vs Seller) */}
        {mode === "signin" && (
          <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Test Accounts
              </span>
              <span className="text-[10px] font-medium text-slate-400">Tap to auto-fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCredentials("admin@virshipexpress.com", "demo123456")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/50 border border-pink-200/80 dark:border-pink-800/50 text-left transition-colors group cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#E81B75] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-pink-200 leading-tight truncate">
                    Admin Demo
                  </p>
                  <p className="text-[9px] text-[#E81B75] font-medium leading-none">Full access</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCredentials("seller@virshipexpress.com", "demo123456")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/50 text-left transition-colors group cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-blue-200 leading-tight truncate">
                    Seller Demo
                  </p>
                  <p className="text-[9px] text-blue-600 dark:text-blue-400 font-medium leading-none">Seller portal</p>
                </div>
              </button>
            </div>
          </div>
        )}

        <form action={formAction} className="mt-4 space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  name="fullName"
                  required
                  autoComplete="name"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:border-[#E81B75] transition shadow-sm"
                  placeholder="Daniella Sophia Amora"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Email / Corporate ID
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                ref={emailRef}
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue="admin@virshipexpress.com"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus-border-[#E81B75] transition shadow-sm"
                placeholder="admin@virshipexpress.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                ref={pwRef}
                name="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                defaultValue="demo123456"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:border-[#E81B75] transition shadow-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signin" && (
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 dark:border-slate-600 text-[#E81B75] focus:ring-[#E81B75] w-3.5 h-3.5"
                />
                <span>Remember me</span>
              </label>
            </div>
          )}

          {mode === "signup" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Account Role
                </label>
                <select
                  name="role"
                  defaultValue="Seller"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:border-[#E81B75] transition shadow-sm cursor-pointer"
                >
                  {REGISTER_ROLES.map(({ role, label }) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    name="confirmPassword"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    defaultValue="demo123456"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:border-[#E81B75] transition shadow-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}

          {state.error && (
            <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          {state.message && (
            <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
          )}

          <div className="pt-2">
            <SubmitButton mode={mode} pending={isActionPending} />
          </div>
        </form>
      </div>
    </div>
  );
}