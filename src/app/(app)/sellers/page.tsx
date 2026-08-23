import { requirePermission } from "@/lib/auth";
import { listSellersAdmin } from "@/lib/repos/sellers";
import SellersClient from "./SellersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sellers — Airship Express" };

export default async function SellersPage() {
  // Backend authorization: sellers/customers can never render this page.
  await requirePermission("sellers.manage");
  const sellers = await listSellersAdmin();
  return <SellersClient sellers={sellers} />;
}
