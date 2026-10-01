import { PackageSearch, MapPin, Clock, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  hashTrackingToken,
  isValidTrackingTokenFormat,
  INVALID_TRACKING_LINK_MESSAGE,
} from "@/lib/trackingLinks";
import TrackingTimeline from "@/components/parcels/TrackingTimeline";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import type { TrackingLog } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parcel Tracking — Airship Express" };

interface PublicParcel {
  tracking_number: string | null;
  reference: string;
  status: string;
  delivery_method: string | null;
  platform: string | null;
  origin: string;
  destination: string;
  expected_delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

interface PublicEvent {
  status: string | null;
  message: string;
  location: string | null;
  event_type: string;
  level: string;
  created_at: string;
}

/**
 * Public customer tracking page — NO login, NO session, strictly read-only.
 * The token is validated + resolved server-side through the
 * get_parcel_by_tracking_token() RPC. Missing/invalid/expired/revoked links
 * all render one identical generic message (no existence oracle).
 */
export default async function PublicTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const clean = (token ?? "").trim();

  let parcel: PublicParcel | null = null;
  let events: TrackingLog[] = [];

  if (isValidTrackingTokenFormat(clean)) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("get_parcel_by_tracking_token", {
        p_token_hash: hashTrackingToken(clean),
      });
      const result = data as {
        ok: boolean;
        parcel?: PublicParcel;
        events?: PublicEvent[];
      } | null;
      if (result?.ok && result.parcel) {
        parcel = result.parcel;
        events = (result.events ?? []).map((e, i) => ({
          id: `public-${i}`,
          shipment_id: "",
          event_type: e.event_type,
          message: e.message,
          level: e.level,
          lat: null,
          lng: null,
          location: e.location,
          status: e.status,
          created_by: null,
          created_at: e.created_at,
        })) as TrackingLog[];
      }
    } catch {
      parcel = null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Brand bar */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/airship-pink-mark.png"
            alt="Airship Express"
            width={36}
            height={22}
            className="w-9 h-[22px] object-contain"
          />
          <div className="leading-none">
            <p className="font-black tracking-wide text-sm">
              AIRSHIP <span className="text-pink-500">EXPRESS</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Parcel Tracking</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {!parcel ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-10 text-center">
            <PackageSearch className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {INVALID_TRACKING_LINK_MESSAGE}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ask the seller for a new tracking link if you believe this is a mistake.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-950 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold mb-1">
                    Tracking Number
                  </p>
                  <p className="font-mono text-lg font-black">
                    {parcel.tracking_number ?? parcel.reference}
                  </p>
                </div>
                <StatusBadge status={parcel.status} />
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-pink-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold">Route</p>
                    <p className="font-bold">
                      {parcel.origin} → {parcel.destination}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-pink-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold">Last Updated</p>
                    <p className="font-bold">{formatDateTime(parcel.updated_at)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/15 font-bold text-pink-200">
                  Delivery Method:{" "}
                  {parcel.delivery_method ? parcel.delivery_method.toUpperCase() : "Not specified"}
                </span>
                {parcel.platform && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/15 font-semibold text-slate-200">
                    {parcel.platform}
                  </span>
                )}
              </div>
              <p className="mt-4 text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-400" />
                Registered {formatDateTime(parcel.created_at)}
                {parcel.expected_delivery_date
                  ? ` · Expected delivery ${formatDateTime(parcel.expected_delivery_date).split(" — ")[0]}`
                  : ""}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-5">
                Tracking History
              </h2>
              <TrackingTimeline currentStatus={parcel.status} events={events} />
            </div>
          </>
        )}
      </main>

      <footer className="bg-[#E81B75] text-white">
        <div className="max-w-3xl mx-auto px-4 py-3 text-center text-[11px] font-medium opacity-95">
          Airship Express Courier Services · 0945 441 8789 · airshipexpress.s@gmail.com
        </div>
      </footer>
    </div>
  );
}
