"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { RouteRecommendation, TransportMode } from "@/types";

export interface BookingResult {
  ok: boolean;
  error?: string;
  reference?: string;
  shipmentId?: string;
}

function newReference() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SHP-${yr}-${rand}`;
}

export async function createBooking(
  form: {
    clientName: string;
    shipper: string;
    consignee: string;
    origin: string;
    destination: string;
    mode: TransportMode;
    cargoType: string;
    incoterms: string;
    weightKg: number;
    volumeCbm: number;
    hazardClass: string;
    poNumber: string;
  },
  selectedRoute?: RouteRecommendation | null,
): Promise<BookingResult> {
  const profile = await requireRole(["Admin", "Dispatcher"]);
  const supabase = await createClient();

  const reference = newReference();
  const etd = new Date();
  const transit = selectedRoute?.transitTimeDays ?? 14;
  const eta = new Date(Date.now() + transit * 86_400_000);

  const { data, error } = await supabase
    .from("shipments")
    .insert({
      reference,
      tracking_number: `TRK-${form.mode.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
      client_name: form.clientName,
      shipper: form.shipper,
      consignee: form.consignee,
      origin: form.origin,
      destination: form.destination,
      mode: form.mode,
      status: "Booked",
      etd: etd.toISOString().slice(0, 10),
      eta: eta.toISOString().slice(0, 10),
      cargo_type: form.cargoType,
      carrier: selectedRoute?.carrierName ?? "Pending Allocation",
      vessel: selectedRoute?.carrierName ?? null,
      po_number: form.poNumber || null,
      weight_kg: form.weightKg,
      volume_cbm: form.volumeCbm,
      hazard_class: form.hazardClass,
      incoterms: form.incoterms,
      current_location: `${form.origin} Freight Depot`,
      progress: 5,
      created_by: profile.id,
    })
    .select("id, reference")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create booking" };
  }

  // Booking event → drives the realtime activity feed.
  await supabase.from("shipment_tracking_logs").insert({
    shipment_id: data.id,
    event_type: "booking",
    level: "success",
    message: `New shipment ${reference} booked for ${form.clientName} (${form.origin} → ${form.destination})`,
    location: `${form.origin} Freight Depot`,
    created_by: profile.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/tracking");
  return { ok: true, reference, shipmentId: data.id };
}
