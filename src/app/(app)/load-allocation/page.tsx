import { requireRole, canApproveLoadPlans, OPS_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import LoadAllocationBoard from "./LoadAllocationBoard";
import type { LoadPlan } from "@/types";

export const dynamic = "force-dynamic";

export default async function LoadAllocationPage() {
  const profile = await requireRole(OPS_ROLES);
  const supabase = await createClient();
  const { data } = await supabase
    .from("load_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Capacity optimization"
        title="ML Load Allocation"
        description="Propose vehicle fills from Booked freight. Planner drafts; Admin/Dispatcher approve."
      />
      <LoadAllocationBoard
        plans={(data ?? []) as LoadPlan[]}
        canApprove={canApproveLoadPlans(profile.role)}
      />
    </div>
  );
}
