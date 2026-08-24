"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/**
 * Admin-only: broadcast this device's GPS position as the parcel's courier
 * location (field/demo use — real fleets post from a driver device).
 * Posts to /api/courier-location which calls the `post_tracking_update` RPC:
 * it validates coordinates are inside the Philippines and writes both the
 * GPS tracking event and the row update that the realtime map subscribes to.
 */
export default function ShareLocationButton({ parcelId }: { parcelId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  function share() {
    if (!("geolocation" in navigator)) {
      toast.error("This device has no geolocation support");
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/courier-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parcelId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          const body = (await res.json()) as { ok?: boolean; error?: string };
          if (res.ok && body.ok) {
            toast.success("Courier position updated on the map");
            router.refresh();
          } else {
            toast.error(body.error ?? "Failed to share location");
          }
        } catch {
          toast.error("Network error while sharing location");
        } finally {
          setPending(false);
        }
      },
      (err) => {
        toast.error(err.message || "Location permission denied");
        setPending(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    );
  }

  return (
    <button
      onClick={share}
      disabled={pending}
      className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      title="Share this device's GPS position as the courier's location"
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Navigation className="w-3.5 h-3.5 text-pink-600" />
      )}
      Share GPS Position
    </button>
  );
}