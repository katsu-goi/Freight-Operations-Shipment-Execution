"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  signInSchema,
  signUpSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  otpCodeRule,
} from "@/lib/validation/schemas";
import type { AppRole } from "@/types";

import { parseAppRole } from "@/lib/roles";
import { issueOtp, verifyOtp } from "@/lib/otp";

export interface AuthState {
  error?: string;
  message?: string;
}

/**
 * Supabase-JS surfaces connectivity problems as a raw "fetch failed".
 * Translate that into an actionable message so the form doesn't show
 * a cryptic error when the local stack is down. Invalid credentials are
 * mapped to a generic message that never reveals whether an email exists.
 */
function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("email not confirmed")
  ) {
    return "Invalid email or password.";
  }
  const isConnectivity =
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("network request failed");
  if (!isConnectivity) return message;

  let host = "the Supabase server";
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const parsedHost = new URL(url).host;
    if (parsedHost) host = parsedHost;
  } catch {
    // Keep the generic label when the env URL is missing/malformed.
  }
  const isLocal = host.includes("127.0.0.1") || host.includes("localhost");
  return isLocal
    ? `Cannot reach the local auth server (${host}) — it is not running. Start Docker Desktop, run \`supabase start\`, then restart \`npm run dev\`.`
    : `Cannot reach the auth server (${host}). Check your network / Supabase project status and restart \`npm run dev\`.`;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Sign-in validates format only — never password complexity.
  // Complexity (uppercase, number, special char) is register-only.
  try {
    signInSchema.parse({ email: rawEmail, password });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
  }

  const email = rawEmail.trim();

  let destination = "/dashboard";

  try {
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendlyAuthError(error.message) };

    // Resolve user's role from profiles or metadata
    let targetRole: AppRole = "Customer";
    if (authData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile?.role) {
        targetRole = parseAppRole(profile.role) ?? "Customer";
      } else if (authData.user.user_metadata?.role) {
        targetRole = parseAppRole(authData.user.user_metadata.role) ?? "Customer";
      }
    }

    if (targetRole === "SuperAdmin" || targetRole === "Admin") {
      destination = "/admin/dashboard";
    } else if (targetRole === "Seller") {
      destination = "/seller/dashboard";
    } else {
      destination = "/dashboard";
    }

    revalidatePath("/", "layout");
  } catch (e) {
    // Re-throw redirect errors if triggered internally
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      typeof (e as { digest: string }).digest === "string" &&
      (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error("signIn failed:", e);
    return { error: "Unable to connect to authentication service. Please try again." };
  }

  redirect(destination);
}

/**
 * Stable form entry point for password sign-in. Registration uses the
 * dedicated OTP actions below (requestSellerOtp → verifySellerOtpAndRegister)
 * so no account exists until the email OTP is verified.
 */
export async function authenticate(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return signIn(prev, formData);
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error("signOut failed:", e);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Seller-only registration with email OTP verification.
// The account (auth user + sellers row + profile link) is created ONLY after
// the OTP is verified. Passwords are hashed by Supabase Auth (bcrypt) —
// never stored as plain text anywhere.
// ---------------------------------------------------------------------------

function sellerRef() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SELL-${yr}-${rand}`;
}

/**
 * Step 1: validate the full seller form, reject duplicate emails, then issue
 * a 6-digit OTP to the address (10-minute expiry, 5 attempts, resend after
 * 60s — see lib/otp.ts).
 */
export async function requestSellerOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const input = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    address: String(formData.get("address") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    contactNumber: String(formData.get("contactNumber") ?? ""),
  };
  try {
    signUpSchema.parse(input);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
  }

  const email = input.email.trim().toLowerCase();
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Registration service is not configured. Please try again later." };
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return { error: "This email is already registered. Please sign in instead." };
  }

  const issued = await issueOtp(email, "seller_registration", {
    name: input.fullName.trim(),
  });
  if (!issued.ok) return { error: issued.error };
  return {
    message:
      "Verification code sent — check your email. It expires in 10 minutes. Enter it below to complete registration.",
  };
}

/**
 * Step 2: verify the OTP, then create the auth account + seller business
 * record + profile link atomically (best effort), and sign the seller in.
 */
export async function verifySellerOtpAndRegister(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const input = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    address: String(formData.get("address") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    contactNumber: String(formData.get("contactNumber") ?? ""),
  };
  const token = String(formData.get("token") ?? "").trim();
  try {
    signUpSchema.parse(input);
    otpCodeRule.parse(token);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
  }

  const email = input.email.trim().toLowerCase();
  const checked = await verifyOtp(email, "seller_registration", token);
  if (!checked.ok) return { error: checked.error };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Registration service is not configured. Please try again later." };
  }

  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (taken) {
    return { error: "This email is already registered. Please sign in instead." };
  }

  // Auth account — Supabase Auth hashes the password (bcrypt); the plain
  // password is never written to our tables. Role is forced to Seller.
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim(), role: "Seller" },
  });
  if (authError || !authUser?.user) {
    if (authError && /already|exists|registered/i.test(authError.message)) {
      return { error: "This email is already registered. Please sign in instead." };
    }
    return { error: friendlyAuthError(authError?.message ?? "Registration failed") };
  }

  const supabase = await createClient();
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .insert({
      reference: sellerRef(),
      name: input.fullName.trim(),
      business_name: input.companyName.trim(),
      phone: input.contactNumber.trim(),
      email,
      address: input.address.trim(),
      pickup_frequency: "On-demand",
      created_by: authUser.user.id,
    })
    .select("id, reference")
    .single();
  if (sellerError || !seller) {
    // Roll back the orphaned auth account so a retry starts clean.
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: sellerError?.message ?? "Could not create the seller record." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: authUser.user.id,
      email,
      full_name: input.fullName.trim(),
      role: "Seller",
      is_active: true,
      seller_id: seller.id,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    return { error: profileError.message };
  }

  // Sign the verified seller straight into their dashboard.
  try {
    const userClient = await createClient();
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (signInError) {
      return {
        message:
          "Account created and email verified. Please sign in with your new credentials.",
      };
    }
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("post-registration sign-in failed:", e);
    return {
      message:
        "Account created and email verified. Please sign in with your new credentials.",
    };
  }
  redirect("/seller/dashboard");
}

// ---------------------------------------------------------------------------
// Forgot password with email OTP verification.
// Request/verify messages are identical whether or not the email exists, so
// attackers cannot probe for registered accounts.
// ---------------------------------------------------------------------------

const RESET_GENERIC_MESSAGE =
  "If this email is registered, a verification code has been sent. It expires in 10 minutes.";

/** Step 1: issue a password-reset OTP (silent when the email is unknown). */
export async function requestPasswordResetOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  try {
    passwordResetRequestSchema.parse({ email });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
  }
  const normalized = email.trim().toLowerCase();

  try {
    const admin = createAdminClient();
    const { data: account } = await admin
      .from("profiles")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    if (account) {
      await issueOtp(normalized, "password_reset");
    }
  } catch (e) {
    console.error("requestPasswordResetOtp failed:", e);
  }
  return { message: RESET_GENERIC_MESSAGE };
}

/**
 * Step 2+3: verify the OTP and set the new strong password in one checked
 * action. The code is single-use; the old password stops working immediately.
 */
export async function resetPasswordWithOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const input = {
    email: String(formData.get("email") ?? ""),
    token: String(formData.get("token") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  try {
    passwordResetConfirmSchema.parse(input);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
  }
  const normalized = input.email.trim().toLowerCase();

  const checked = await verifyOtp(normalized, "password_reset", input.token);
  if (!checked.ok) return { error: checked.error };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Password service is not configured. Please try again later." };
  }
  const { data: account } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (!account) {
    // Verified against a code that should not exist — generic failure.
    return { error: "Code expired or invalid. Request a new code and try again." };
  }

  const { error } = await admin.auth.admin.updateUserById(account.id, {
    password: input.newPassword,
    email_confirm: true,
  });
  if (error) return { error: friendlyAuthError(error.message) };

  return { message: "Password successfully changed. Please sign in with your new password." };
}
