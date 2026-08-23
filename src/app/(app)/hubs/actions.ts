"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkPermission } from "@/lib/auth";
import { runAction, okVoid, fail, type ActionResult } from "@/lib/actions/result";
import { hubSchema, hubUpdateSchema } from "@/lib/validation/schemas";

/** Admin/staff: create a hub/facility. */
export async function createHub(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("hubs.create", hubSchema, input, async (form) => {
    const check = await checkPermission("hubs.manage");
    if ("error" in check) return fail("Only administrators can manage hubs");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hubs")
      .insert({
        name: form.name,
        code: form.code || null,
        address: form.address || null,
        city: form.city || null,
        province: form.province || null,
        contact: form.contact || null,
        created_by: check.profile.id,
      })
      .select("id")
      .single();
    if (error) return fail(error.message);

    revalidatePath("/hubs");
    return { ok: true, value: { id: data.id } } as ActionResult<{ id: string }>;
  });
}

/** Admin/staff: update a hub/facility. */
export async function updateHub(input: unknown): Promise<ActionResult> {
  return runAction("hubs.update", hubUpdateSchema, input, async (form) => {
    const check = await checkPermission("hubs.manage");
    if ("error" in check) return fail("Only administrators can manage hubs");

    const supabase = await createClient();
    const { error } = await supabase
      .from("hubs")
      .update({
        name: form.name,
        code: form.code || null,
        address: form.address || null,
        city: form.city || null,
        province: form.province || null,
        contact: form.contact || null,
      })
      .eq("id", form.hubId);
    if (error) return fail(error.message);

    revalidatePath("/hubs");
    return okVoid();
  });
}
