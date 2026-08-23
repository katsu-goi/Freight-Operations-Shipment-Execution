import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Building2,
  Package,
  CalendarClock,
  Weight,
  Wallet,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { canUpdateParcelStatus } from "@/lib/rbac";
import { getParcelById, getTrackingTimeline } from "@/lib/repos/parcels";
import { listHubs } from "@/lib/repos/hubs";
import TrackingTimeline from "@/components/parcels/TrackingTimeline";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import ParcelOpsPanel from "./ParcelOpsPanel";

export const dynamic = "force-dynamic";

export default async function ParcelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;

  // RLS: sellers see only their parcels; customers only assigned ones.
  const parcel = await getParcelById(id);
  if (!parcel) notFound();

  const [events, hubs] = await Promise.all([
    getTrackingTimeline(parcel.id),
    canUpdateParcelStatus(profile.role)
      ? listHubs()
      : Promise.resolve([]),
  ]);

  const staffOps = canUpdateParcelStatus(profile.role);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <Link
        href="/parcels"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-pink-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to parcels
      </Link>

      <PageHeader
        eyebrow="Parcel"
        title={parcel.tracking_number ?? parcel.reference}
        description={`Registered ${formatDateTime(parcel.created_at)}`}
        actions={<StatusBadge status={parcel.status} />}
      />

      {/* Current position banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-950 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
            <Package className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold">
              Current Status
            </p>
            <p className="text-lg font-black">{parcel.status}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
            <MapPin className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold">
              Current Location
            </p>
            <p className="text-sm font-bold">{parcel.hubName ?? parcel.current_location ?? "Unknown"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
            <Clock className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold">
              Last Updated
            </p>
            <p className="text-sm font-bold">
              {parcel.updated_at ? formatDateTime(parcel.updated_at) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Parcel Details
            </h3>
            <dl className="space-y-3 text-xs">
              <Detail icon={User} label="Recipient" value={parcel.consignee ?? "—"} sub={parcel.recipient_phone} />
              <Detail icon={Building2} label="Seller" value={parcel.sellerName ?? "Walk-in"} sub={parcel.sellerReference ?? undefined} />
              <Detail icon={MapPin} label="Route" value={`${parcel.origin} → ${parcel.destination}`} />
              <Detail
                icon={CalendarClock}
                label="Expected Delivery"
                value={
                  parcel.expected_delivery_date
                    ? formatDate(parcel.expected_delivery_date)
                    : "—"
                }
              />
              <Detail
                icon={Weight}
                label="Weight / Dimensions"
                value={`${Number(parcel.weight_kg).toFixed(2)} kg${
                  parcel.dimensions ? ` · ${parcel.dimensions} cm` : ""
                }`}
              />
              <Detail
                icon={Wallet}
                label="Fees"
                value={`${formatCurrency(Number(parcel.shipping_fee ?? 0))}${
                  Number(parcel.cod_amount) > 0
                    ? ` · COD ${formatCurrency(Number(parcel.cod_amount))}`
                    : ""
                }`}
              />
              {parcel.description && (
                <Detail icon={Package} label="Description" value={parcel.description} />
              )}
            </dl>
          </div>

          {staffOps && hubs.length >= 0 && (
            <ParcelOpsPanel
              parcelId={parcel.id}
              currentStatus={parcel.status}
              currentHubId={parcel.current_hub_id}
              hubs={hubs.map((h) => ({ id: h.id, name: h.name }))}
            />
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-5">
              Tracking History
            </h3>
            <TrackingTimeline currentStatus={parcel.status} events={events} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          {label}
        </dt>
        <dd className="font-semibold text-slate-700 dark:text-slate-200 break-words">
          {value}
          {sub && (
            <span className="block text-[11px] text-slate-400 font-normal">{sub}</span>
          )}
        </dd>
      </div>
    </div>
  );
}
