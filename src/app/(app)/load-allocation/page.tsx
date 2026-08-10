import { requireRole, canApproveLoadPlans, OPS_ROLES } from "@/lib/auth";
import { listLoadPlans } from "@/lib/repos/loadplans";
import PageHeader from "@/components/ui/PageHeader";
import LoadAllocationBoard from "./LoadAllocationBoard";

export const dynamic = "force-dynamic";

export default async function LoadAllocationPage() {
  const profile = await requireRole(OPS_ROLES);
  const plans = await listLoadPlans();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Capacity optimization"
        title="ML Load Allocation"
        description="Propose vehicle fills from Booked freight. Planner drafts; Admin/Dispatcher approve."
      />
      <LoadAllocationBoard
        plans={plans}
        canApprove={canApproveLoadPlans(profile.role)}
      />
    </div>
  );
}
