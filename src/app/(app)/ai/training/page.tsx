import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import TrainingClient from "./TrainingClient";
import type { AiTrainingExample, AiTrainingJob } from "@/types";

export const dynamic = "force-dynamic";

export default async function AiTrainingPage() {
  await requirePermission("ai.train");
  const supabase = await createClient();
  const [{ data: examples }, { data: jobs }] = await Promise.all([
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Train your AI
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
          Submit operator corrections from live system data (good routes, fixed
          BoL parses). They are stored as few-shot examples and automatically
          injected into the next routing / BoL AI calls. Press “Run training”
          to snapshot the active set into the job ledger.
        </p>
      </div>
      <TrainingClient
        initialExamples={(examples ?? []) as AiTrainingExample[]}
        initialJobs={(jobs ?? []) as AiTrainingJob[]}
      />
    </div>
  );
}
