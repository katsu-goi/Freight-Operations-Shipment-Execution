"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/types";

export interface AuthState {
  error?: string;
  message?: string;
}

/** Shared password for the one-click demo accounts. */
const DEMO_PASSWORD = "demo123456";

/** Roles a new user may self-assign at registration. Staff/Seller roles are
 *  provisioned by an administrator only — never via self-signup. */
const SELF_SIGNUP_ROLES: AppRole[] = ["Customer"];

/** One-click demo login: enabled in development, production requires opt-in. */
const QUICK_LOGIN_ENABLED =
  process.env.ALLOW_QUICK_LOGIN === "true" || process.env.NODE_ENV !== "production";

/** Fixed demo user per role, provisioned on first quick-login. */
const DEMO_USERS: Record<
  AppRole,
  { email: string; fullName: string }
> = {
  Admin: { email: "admin@freightos.demo", fullName: "Sol, Emmanuel M." },
  Seller: { email: "seller@freightos.demo", fullName: "Amora, Daniella Sophia P." },
  Customer: { email: "customer@freightos.demo", fullName: "Reyes, Miguel A." },
};

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const requested = String(formData.get("role") ?? "Customer") as AppRole;
  // Self-signup may only claim an untrusted role. Anything else → Customer.
  const role = SELF_SIGNUP_ROLES.includes(requested) ? requested : "Customer";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) return { error: error.message };

  return {
    message:
      "Account created. Check your email to confirm, then sign in. " +
      "(If email confirmation is disabled, you can sign in now.)",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * One-click demo login. Idempotently provisions a confirmed auth user for the
 * given role via the service-role client (so it works on a fresh database),
 * ensures the profile carries the right role, then signs in.
 *
 * Intended for demos/evaluation. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export async function quickLogin(role: AppRole): Promise<AuthState> {
  if (!QUICK_LOGIN_ENABLED) {
    return {
      error: "Quick login is disabled here. Register a user manually instead.",
    };
  }

  const demo = DEMO_USERS[role];
  if (!demo) return { error: "Unknown role" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Quick login needs SUPABASE_SERVICE_ROLE_KEY. Register a user manually instead.",
    };
  }

  try {
    // Create the user if missing; confirm the email so sign-in works immediately.
    const { error: createError } = await admin.auth.admin.createUser({
      email: demo.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: demo.fullName, role },
    });

    // "already registered" is expected on repeat clicks — ignore it.
    if (
      createError &&
      !/already|exists|registered/i.test(createError.message)
    ) {
      return { error: createError.message };
    }

    // Ensure the profile row exists and carries the correct role (the signup
    // trigger sets it on creation; this keeps it correct on repeat logins).
    const { data: userList } = await admin.auth.admin.listUsers();
    const authUser = userList?.users.find((u) => u.email === demo.email);
    if (authUser) {
      await admin.auth.admin.updateUserById(authUser.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        ban_duration: "none",
        user_metadata: { full_name: demo.fullName, role },
      });

      // Seller demo accounts need a linked sellers business record.
      let sellerId: string | null = null;
      if (role === "Seller") {
        const { data: seller } = await admin
          .from("sellers")
          .upsert(
            {
              reference: "SELL-DEMO-0001",
              name: demo.fullName,
              email: demo.email,
              is_active: true,
            },
            { onConflict: "reference" },
          )
          .select("id")
          .maybeSingle();
        sellerId = seller?.id ?? null;
      }

      await admin.from("profiles").upsert(
        {
          id: authUser.id,
          email: demo.email,
          full_name: demo.fullName,
          role,
          is_active: true,
          seller_id: sellerId,
        },
        { onConflict: "id" },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: demo.email,
      password: DEMO_PASSWORD,
    });
    if (error) return { error: error.message };

    revalidatePath("/", "layout");
    redirect("/dashboard");
  } catch (e: unknown) {
    // Next.js redirect() throws a NEXT_REDIRECT error — must rethrow it.
    if (
      e !== null &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest: unknown }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    // Network failure when Supabase is down surfaces as "Failed to fetch".
    if (/failed to fetch|fetch failed|ECONNREFUSED|network/i.test(msg)) {
      return {
        error:
          "Cannot reach Supabase at " +
          (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "127.0.0.1:54321") +
          ". Is Docker + `supabase start` running? Try: start Docker Desktop, then run `npx supabase start` and `npm run dev`.",
      };
    }
    return { error: msg || "Quick login failed. Check Supabase is running." };
  }
}
