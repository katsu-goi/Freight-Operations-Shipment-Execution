import { requirePermission } from "@/lib/auth";
import { listHubs, getHubParcelCounts } from "@/lib/repos/hubs";
import HubsClient from "./HubsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hubs — Airship Express" };

export default async function HubsPage() {
  await requirePermission("hubs.manage");
  const [hubs, counts] = await Promise.all([listHubs(), getHubParcelCounts()]);
  return <HubsClient hubs={hubs} counts={Object.fromEntries(counts)} />;
}
