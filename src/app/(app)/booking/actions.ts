"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { runAction, ok, fail, type ActionResult } from "@/lib/actions/result";
import { bookingSchema, type BookingInput } from "@/lib/validation/schemas";
import { serverLog } from "@/lib/server/log";
import type { RouteRecommendation, TransportMode } from "@/types";

export interface BookingFields {
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
}

function newReference() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SHP-${yr}-${rand}`;
}

/**
 * Create a booking. Wrapped for validation + logging; retries on the rare
 * random-reference collision so one duplicate draw never turns into an
 * unhandled failure for the operator.
 */
export async function createBooking(
  input: BookingFields,
  selectedRoute?: RouteRecommendation | null,
): Promise<ActionResult<{ reference: string; shipmentId: string }>> {
  return runAction("booking.createBooking", bookingSchema, input, async (form) => {
    const profile = await requireRole(["Admin", "Dispatcher", "Planner"]);
    const supabase = await createClient();

    const etd = new Date();
    const transit = selectedRoute?.transitTimeDays ?? 3;
    const eta = new Date(Date.now() + transit * 86_400_000);

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      // Prefer the DB sequence reference; fall back to a random one on error.
      let reference: string | null = null;
      if (attempt === 0) {
        const { data: refData, error: refError } = await supabase.rpc(
          "next_shipment_reference",
        );
        if (!refError && refData) reference = refData;
      }
      reference = reference ?? newReference();
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
          current_lat: 14.5995,
          current_lng: 120.9842,
          progress: 5,
          created_by: profile.id,
        })
        .select("id, reference")
        .single();

      if (error) {
        if (/duplicate key|23505/i.test(error.message)) {
          lastError = error.message;
          continue; // retry with a fresh random reference
        }
        return fail(error.message);
      }
      if (!data) return fail("Failed to create booking");

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
      return ok({ reference, shipmentId: data.id });
    }

    serverLog.warn("booking.createBooking", { err: lastError, attempts: 3 });
    return fail(lastError ?? "Could not generate a unique reference; try again");
  });
}