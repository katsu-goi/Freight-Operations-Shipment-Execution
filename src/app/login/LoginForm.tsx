"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Ship,
  Loader2,
  LogIn,
  UserPlus,
  ShieldCheck,
  Radar,
  Truck,
  Building2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { signIn, signUp, quickLogin, type AuthState } from "./actions";
import type { AppRole } from "@/types";

const ROLES: AppRole[] = ["Admin", "Dispatcher", "Carrier", "Client"];

const QUICK_ROLES: { role: AppRole; icon: LucideIcon; hint: string }[] = [
  { role: "Admin", icon: ShieldCheck, hint: "Full access" },
  { role: "Dispatcher", icon: Radar, hint: "Operations" },
  { role: "Carrier", icon: Truck, hint: "Assigned loads" },
  { role: "Client", icon: Building2, hint: "Own shipments" },
];

function SubmitButton({ mode }: { mode: "signin" | "signup" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-pink-600/30 transition-all active:scale-[0.99]"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : mode === "signin" ? (
        <LogIn className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {mode === "signin" ? "Sign in" : "Create account"}
    </button>
  );
}

export default function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, {});

  const [isPending, startTransition] = useTransition();
  const [quickRole, setQuickRole] = useState<AppRole | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  function handleQuickLogin(role: AppRole) {
    setQuickError(null);
    setQuickRole(role);
    startTransition(async () => {
      // On success quickLogin redirects; only an error resolves here.
      const result = await quickLogin(role);
      if (result?.error) {
        setQuickError(result.error);
        setQuickRole(null);
      }
    });
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-gradient-to-tr from-pink-600 to-rose-500 p-3 rounded-2xl shadow-lg shadow-pink-500/20 text-white">
          <Ship className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-black text-white text-2xl tracking-tight">
            Freight<span className="text-pink-500">OS</span>
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            Shipment Execution Subsystem
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
                mode === m ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {m === "signin" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form action={formAction} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full name
              </label>
              <input
                name="fullName"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Jane Dispatcher"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="••••••••"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Role (RBAC)
              </label>
              <select
                name="role"
                defaultValue="Client"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
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
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {state.message}
            </p>
          )}

          <SubmitButton mode={mode} />
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-pink-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quick login (demo)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_ROLES.map(({ role, icon: Icon, hint }) => {
              const busy = isPending && quickRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleQuickLogin(role)}
                  disabled={isPending}
                  className="group flex items-center gap-2.5 border border-slate-200 hover:border-pink-300 hover:bg-pink-50/60 disabled:opacity-60 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98]"
                >
                  <span className="shrink-0 rounded-lg bg-slate-900 group-hover:bg-pink-600 text-white p-1.5 transition-colors">
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900 leading-tight">
                      {role}
                    </span>
                    <span className="block text-[10px] text-slate-400 leading-tight">
                      {hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {quickError && (
            <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {quickError}
            </p>
          )}
          <p className="mt-3 text-[10px] text-slate-400 leading-snug">
            One click provisions a confirmed demo account for that role and signs
            you in. Shared password: <span className="font-mono">demo123456</span>.
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">
        Role-based access · Admin · Dispatcher · Carrier · Client
      </p>
    </div>
  );
}
