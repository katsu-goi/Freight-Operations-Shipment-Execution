import { createClient } from "@/lib/supabase/server";
import {
  requireUser,
  validate,
  withErrors,
  rateLimit,
  clientIp,
  jsonOk,
  ApiError,
} from "@/lib/server/api";
import { aiTrainingExampleSchema } from "@/lib/validation/schemas";
import { z } from "zod";

/**
 * Train-your-AI API (Admin / SuperAdmin only).
 *  GET  /api/ai/train            → list recent examples + jobs
 *  POST /api/ai/train            → { action: "example", ...fields } | { action: "run" }
 *  "run" snapshots the active example count into ai_training_jobs (Completed
 *  immediately — few-shot injection needs no GPU step; the next routing/BoL
 *  call automatically learns from the new examples).
 */
const runSchema = z.object({ action: z.literal("run") });

export async function GET() {
  return withErrors(async () => {
    const supabase = await createClient();
    const sessionUser = await requireUser(supabase);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionUser.id)
      .maybeSingle();
    if (profile?.role !== "Admin" && profile?.role !== "SuperAdmin") {
      throw new ApiError(403, "AI training is restricted to administrators");
    }
    const [examples, jobs] = await Promise.all([
      supabase
        .from("ai_training_examples")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_training_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return jsonOk({ examples: examples.data ?? [], jobs: jobs.data ?? [] });
  }, "ai-train-list");
}

export async function POST(request: Request) {
  return withErrors(async () => {
    const supabase = await createClient();
    const sessionUser = await requireUser(supabase);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionUser.id)
      .maybeSingle();
    if (profile?.role !== "Admin" && profile?.role !== "SuperAdmin") {
      throw new ApiError(403, "AI training is restricted to administrators");
    }
    if (!rateLimit(`ai:train:${clientIp(request)}`, 30)) {
      throw new ApiError(429, "Rate limit exceeded; try again shortly");
    }
    const body = await request.json().catch(() => {
      throw new ApiError(400, "Invalid JSON body");
    });

    if (body?.action === "run") {
      runSchema.parse(body);
      const { count } = await supabase
        .from("ai_training_examples")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      const { data, error } = await supabase
        .from("ai_training_jobs")
        .insert({
          status: "Completed",
          example_count: count ?? 0,
          model_hint: "few-shot-prompt",
          summary: `Few-shot prompt refreshed with ${count ?? 0} active operator corrections. Next routing/BoL calls include them as context.`,
          created_by: sessionUser.id,
          completed_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, error.message);
      return jsonOk({ job: data });
    }

    const input = validate(aiTrainingExampleSchema, body);
    const { data, error } = await supabase
      .from("ai_training_examples")
      .insert({
        kind: input.kind,
        input: input.input,
        expected_output: input.expectedOutput,
        notes: input.notes ?? "",
        created_by: sessionUser.id,
      })
      .select("*")
      .single();
    if (error) throw new ApiError(500, error.message);
    return jsonOk({ example: data });
  }, "ai-train-write");
}
