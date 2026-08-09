import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAppRole } from "@/lib/roles";
import type { AppRole, Profile } from "@/types";

export {
  ALL_ROLES,
  parseAppRole,
  isStaff,
  isOps,
  canApproveLoadPlans,
  canPostTracking,
  OPS_ROLES,
  STAFF_ROLES,
} from "@/lib/roles";

/**
 * Resolve the signed-in user's profile for Server Components.
 * Authorization uses profiles.role only — never user_metadata for gates.
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
    .maybeSingle();

  if (profile) return profile;

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string) ?? user.email ?? null,
    role: parseAppRole(user.user_metadata?.role) ?? "Client",
    org_name: null,
    is_active: true,
    invited_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Guard a page/action to a set of roles; redirect to /dashboard otherwise. */
export async function requireRole(roles: AppRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}
