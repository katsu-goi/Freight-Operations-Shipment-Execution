import { requireRole, getSellerContext } from "@/lib/auth";
import { getShipments } from "@/lib/queries";
import SellerDashboard from "@/components/dashboard/SellerDashboard";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  // Enforce Seller role (Admins also permitted to preview)
  const profile = await requireRole(["Seller", "Admin"]);
  const sellerCtx = await getSellerContext();
  const parcels = await getShipments();

  const sellerName = sellerCtx?.seller?.business_name || sellerCtx?.seller?.name || profile.full_name;

  return <SellerDashboard parcels={parcels} sellerName={sellerName} />;
}
