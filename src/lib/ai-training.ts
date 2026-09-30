import { createClient } from "@/lib/supabase/server";
import type { AiTrainingExample } from "@/types";

/**
 * "Train your AI" — few-shot fine-tuning using system data.
 *
 * There is no separate model-hosting step: approved examples stored in
 * `ai_training_examples` are injected as few-shot context into the routing /
 * BoL prompts (see buildFewShotPrefix). Each "training run" snapshots the
 * active example count into `ai_training_jobs` so admins can track what the
 * model learned from and when.
 */
export async function getActiveExamples(
  kind: "routing" | "bol_parse",
  limit = 8,
): Promise<AiTrainingExample[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ai_training_examples")
      .select("*")
      .eq("kind", kind)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as AiTrainingExample[];
  } catch {
    return [];
  }
}

/** Render stored corrections as a compact few-shot block for the system prompt. */
export function buildFewShotPrefix(
  examples: AiTrainingExample[],
): string {
  if (!examples.length) return "";
  const blocks = examples.slice(0, 8).map(
    (e, i) =>
      `Example ${i + 1}:\nInput: ${e.input.slice(0, 1200)}\nCorrect output: ${e.expected_output.slice(0, 2000)}`,
  );
  return `\n\nLearn from these ${examples.length} operator-approved corrections from live system data and follow the same patterns:\n${blocks.join("\n\n")}`;
}
