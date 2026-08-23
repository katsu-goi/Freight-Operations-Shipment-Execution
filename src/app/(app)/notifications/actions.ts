"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { runAction, okVoid, fail } from "@/lib/actions/result";
import {
  notificationReadSchema,
  passwordChangeSchema,
} from "@/lib/validation/schemas";

/** Mark one (or all) of the signed-in user's notifications as read. */
export async function markNotificationsRead(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runAction("notifications.read", notificationReadSchema, input, async (form) => {
    const profile = await requireProfile();
    const supabase = await createClient();

    if (form.all) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      if (error) return fail(error.message);
    } else if (form.notificationId) {
      // Scoped by user_id so one user can never touch another's rows.
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", form.notificationId)
        .eq("user_id", profile.id);
      if (error) return fail(error.message);
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    return okVoid();
  });
}

/** Change the signed-in user's own password via Supabase Auth. */
export async function changePassword(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runAction("profile.password", passwordChangeSchema, input, async ({ password }) => {
    await requireProfile();
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return fail(error.message);
    return okVoid();
  });
}
