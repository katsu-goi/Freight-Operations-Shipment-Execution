"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import { parseAppRole } from "@/lib/roles";
import {
  userRoleUpdateSchema,
  userActiveToggleSchema,
} from "@/lib/validation/schemas";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !can(parseAppRole(profile.role) ?? "Customer", "users.manage")) {
    return { error: "Forbidden — SuperAdmin only" as const };
  }
  return { supabase, user };
}

export async function updateUserRole(formData: FormData): Promise<void> {
  const gate = await requireSuperAdmin();
  if ("error" in gate) return;
  const parsed = userRoleUpdateSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return;
  // Prevent removing your own SuperAdmin access (lockout guard).
  if (parsed.data.userId === gate.user.id && parsed.data.role !== "SuperAdmin") {
    return;
  }
  await gate.supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const gate = await requireSuperAdmin();
  if ("error" in gate) return;
  const parsed = userActiveToggleSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    isActive: String(formData.get("isActive") ?? "") === "true",
  });
  if (!parsed.success) return;
  if (parsed.data.userId === gate.user.id && !parsed.data.isActive) {
    return;
  }
  await gate.supabase
    .from("profiles")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.userId);
  revalidatePath("/admin/users");
}
