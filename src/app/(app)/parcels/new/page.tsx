import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { listSellers } from "@/lib/repos/sellers";
import PageHeader from "@/components/ui/PageHeader";
import ParcelForm from "./ParcelForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register Parcel — Airship Express" };

export default async function NewParcelPage() {
  // Backend authorization: only staff and sellers may register parcels.
  await requirePermission("parcels.create");
  const profile = await requireProfile();
  const sellers = profile.role === "Seller" ? [] : (await listSellers()).map((s) => ({
    id: s.id,
    name: s.name,
    reference: s.reference,
  }));

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Parcel Management"
        title="Register a Parcel"
        description="A unique PKG tracking number is generated automatically. The seller and recipient are notified as the parcel moves through the network."
      />
      <ParcelForm role={profile.role} sellers={sellers} />
    </div>
  );
}
