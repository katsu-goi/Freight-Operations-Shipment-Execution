"use client";

import { useState, useTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Loader2,
  LogIn,
  UserPlus,
  ShieldCheck,
  Building2,
  Boxes,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { signIn, signUp, quickLogin, type AuthState } from "./actions";
import type { AppRole } from "@/types";

/** Roles available for self-registration. Staff roles are admin-provisioned. */
const ROLES: AppRole[] = ["Customer"];

const QUICK_ROLES: { role: AppRole; icon: LucideIcon; hint: string }[] = [
  { role: "Admin", icon: ShieldCheck, hint: "Full access" },
  { role: "Seller", icon: Building2, hint: "Send parcels" },
  { role: "Customer", icon: Boxes, hint: "Receive parcels" },
];

function SubmitButton({ mode }: { mode: "signin" | "signup" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-[#E81B75] hover:bg-[#D81B60] disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-pink-600/20 transition-all active:scale-[0.99]"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : mode === "signin" ? (
        <LogIn className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {mode === "signin" ? "Sign In" : "Create account"}
    </button>
  );
}

export default function LoginForm({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  const [isPending, startTransition] = useTransition();
  const [quickRole, setQuickRole] = useState<AppRole | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  function handleQuickLogin(role: AppRole) {
    setQuickError(null);
    setQuickRole(role);
    startTransition(async () => {
      const result = await quickLogin(role);
      if (result?.error) {
        setQuickError(result.error);
        setQuickRole(null);
      }
    });
  }

  return (
    <div className="w-full">
      {/* Glass card — Hirna style: frosted, centered, blended */}
      <div className={`${compact ? "bg-transparent backdrop-blur-0 rounded-[16px] overflow-hidden border-0" : "bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"}`}>
        {/* Header inside card — like Hirna — hidden in compact 5-col panel to match image_1 */}
        {!compact && (
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center p-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/airship-pink-mark.png"
                alt="Airship Express"
                width={48}
                height={28}
                className="w-full h-full object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-lg bg-[#E81B75] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/airship-pink-mark.png"
                  alt=""
                  width={20}
                  height={12}
                  className="w-4 h-4 object-contain brightness-0 invert"
                  aria-hidden
                />
              </span>
              <span className="text-xs font-bold tracking-widest text-white/90">Hirna Portal</span>
            </div>
            {/* Actual Airship title — keep brand but Hirna layout */}
            <h1 className="text-xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="mt-1 text-xs text-white/70">Sign in to your account to continue.</p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="text-[11px] font-black tracking-widest text-white">AIRSHIP</span>
              <span className="text-[11px] font-black tracking-widest text-[#E81B75]">EXPRESS</span>
              <span className="text-[10px] text-white/60 ml-1">Shipment Execution</span>
            </div>
          </div>
        )}

        <div className={compact ? "px-4 py-4" : "px-8 pb-8"}>
          <div className="flex gap-1 p-1 bg-white/10 rounded-xl mb-6 backdrop-blur">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
                  mode === m
                    ? "bg-white text-[#E81B75] shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {m === "signin" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form action={formAction} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Full name
                </label>
                <input
                  name="fullName"
                  required
                  className="w-full bg-white/90 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:bg-white"
                  placeholder="Jane Dispatcher"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Email / Corporate ID
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full bg-white/90 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:bg-white"
                placeholder="admin@airshipexpress.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full bg-white/90 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input type="checkbox" className="rounded border-white/30 text-[#E81B75] focus:ring-[#E81B75] bg-white/80" />
                Remember me
              </label>
              <span className="text-xs text-white/60">Contact HR Department</span>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  defaultValue="Customer"
                  className="w-full bg-white/90 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E81B75] focus:bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {state.error && (
              <p className="text-xs text-white bg-red-500/90 border border-red-400 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}
            {state.message && (
              <p className="text-xs text-white bg-emerald-500/90 border border-emerald-400 rounded-lg px-3 py-2">
                {state.message}
              </p>
            )}

            <SubmitButton mode={mode} />
          </form>

          <div className={`${compact ? "mt-3 pt-3" : "mt-6 pt-6"} border-t border-white/10`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3 h-3 text-[#E81B75]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                Quick login (demo)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {QUICK_ROLES.map(({ role, icon: Icon, hint }) => {
                const busy = isPending && quickRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleQuickLogin(role)}
                    disabled={isPending}
                    className="group flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 disabled:opacity-60 rounded-xl px-3 py-3 text-center transition-all active:scale-[0.98] backdrop-blur"
                  >
                    <span className="shrink-0 rounded-lg bg-white/90 group-hover:bg-[#E81B75] text-slate-900 group-hover:text-white p-1.5 transition-colors">
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="text-[11px] font-bold text-white leading-tight">{role}</span>
                    <span className="text-[10px] text-white/60 leading-tight">{hint}</span>
                  </button>
                );
              })}
            </div>

            {quickError && (
              <p className="mt-2 text-xs text-white bg-red-500/90 border border-red-400 rounded-lg px-3 py-2">
                {quickError}
              </p>
            )}
            {!compact && (
              <p className="mt-3 text-[10px] text-white/60 leading-snug text-center">
                One click provisions a confirmed demo account for that role. Shared password:{" "}
                <span className="font-mono text-white/80">demo123456</span>.
              </p>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <p className="text-center text-xs text-white/70 mt-4 drop-shadow">
          Role-based access · Admin · Seller · Customer
        </p>
      )}
    </div>
  );
}
