import { requireRole, isStaff, OPS_ROLES } from "@/lib/auth";
import { listContainersWithShipments } from "@/lib/repos/containers";
import PageHeader from "@/components/ui/PageHeader";
import ConsolidationBoard from "./ConsolidationBoard";

export const dynamic = "force-dynamic";

export default async function ConsolidationPage() {
  const profile = await requireRole(OPS_ROLES);

  const containers = await listContainersWithShipments();

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Consolidation & Deconsolidation"
        title="LCL / FCL Container Load Planning"
        description="Group cargo into containers, balance weight and volume, and manage container breakdown."
      />
      <ConsolidationBoard containers={containers} canManage={isStaff(profile.role)} />
    </div>
  );
}
