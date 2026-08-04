import { requireProfile, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import ConsolidationBoard from "./ConsolidationBoard";
import type { ContainerWithShipments } from "@/types";

export const dynamic = "force-dynamic";

export default async function ConsolidationPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("containers")
    .select(
      "*, container_shipments(shipments(id, reference, weight_kg, volume_cbm, cargo_type))",
    )
    .order("created_at", { ascending: false });

  const containers: ContainerWithShipments[] = (data ?? []).map((c) => {
    const links = (c.container_shipments ?? []) as {
      shipments: ContainerWithShipments["shipments"][number] | null;
    }[];
    const { container_shipments, ...rest } = c as typeof c & {
      container_shipments: unknown;
    };
    return {
      ...(rest as ContainerWithShipments),
      shipments: links.map((l) => l.shipments).filter(Boolean) as ContainerWithShipments["shipments"],
    };
  });

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
