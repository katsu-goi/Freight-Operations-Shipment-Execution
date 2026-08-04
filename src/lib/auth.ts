import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

/**
 * Resolve the signed-in user's profile for Server Components.
 * Redirects to /login when there is no session. Guarantees a profile row
 * (falls back to a minimal Client profile if the trigger hasn't run yet).
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) return profile;

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string) ?? user.email ?? null,
    role: (user.user_metadata?.role as Profile["role"]) ?? "Client",
    org_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Guard a page/action to a set of roles; redirect to /dashboard otherwise. */
export async function requireRole(roles: Profile["role"][]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

export function isStaff(role: Profile["role"]): boolean {
  return role === "Admin" || role === "Dispatcher";
}
