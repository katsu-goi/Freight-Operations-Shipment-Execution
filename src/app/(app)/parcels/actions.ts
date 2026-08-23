"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  requireProfile,
  checkPermission,
  isSellerRole,
} from "@/lib/auth";
import { runAction, ok, okVoid, fail, type ActionResult } from "@/lib/actions/result";
import {
  parcelCreateSchema,
  parcelStatusSchema,
  parcelLocationSchema,
  parcelEditSchema,
  cancelBookingSchema as cancelParcelSchema,
} from "@/lib/validation/schemas";
import { serverLog } from "@/lib/server/log";

/**
 * Parcel management actions.
 *
 * Every action authorizes through lib/auth (DB-backed profile) and relies on
 * RLS as the second enforcement layer. Status changes go through the
 * `update_parcel_status` Postgres RPC so the shipment row, the tracking
 * event, the hub/location refresh and the seller/customer notifications are
 * written atomically in one database round trip.
 */

/** Register a new parcel. Sellers create their own; staff may pick a seller. */
export async function createParcel(
  input: unknown,
): Promise<
  ActionResult<{
    id: string;
    trackingNumber: string;
    reference: string;
    /** Non-fatal notice, e.g. recipient email didn't match an account. */
    warning?: string;
  }>
> {
  return runAction("parcels.create", parcelCreateSchema, input, async (form) => {
    const check = await checkPermission("parcels.create");
    if ("error" in check) return fail("You are not allowed to create parcels");
    const profile = check.profile;

    const supabase = await createClient();

    // Resolve the owning seller. Sellers are pinned to their own account;
    // only staff may assign another seller.
    let sellerId: string | null = null;
    if (isSellerRole(profile.role)) {
      sellerId = profile.seller_id ?? null;
      if (!sellerId) {
        return fail(
          "Your login is not linked to a seller account yet. Ask an administrator.",
        );
      }
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, is_active")
        .eq("id", sellerId)
        .maybeSingle();
      if (!seller?.is_active) {
        return fail("This seller account is archived and cannot register parcels");
      }
    } else {
      sellerId = form.sellerId || null;
    }

    // Optional recipient-account link. Sellers cannot set this
    // (enforced here AND by the RLS with-check clause).
    let clientId: string | null = null;
    if (form.customerEmail && !isSellerRole(profile.role)) {
      const { data: customer } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.customerEmail)
        .eq("role", "Customer")
        .maybeSingle();
      clientId = customer?.id ?? null;
    }

    const { data: trackingNumber } = await supabase.rpc(
      "next_parcel_tracking_number",
    );

    const { data, error } = await supabase
      .from("shipments")
      .insert({
        reference:
          (trackingNumber as string | null)?.replace("PKG", "REF") ??
          crypto.randomUUID(),
        tracking_number: trackingNumber,
        client_name: form.consignee,
        consignee: form.consignee,
        client_id: clientId,
        origin: form.origin,
        destination: form.destination,
        mode: "Road",
        status: "Registered",
        platform: form.platform,
        cargo_type: "Parcel",
        weight_kg: form.weightKg,
        cod_amount: form.codAmount,
        shipping_fee: form.shippingFee || null,
        description: form.description || null,
        dimensions: form.dimensions || null,
        recipient_phone: form.recipientPhone || null,
        expected_delivery_date: form.expectedDeliveryDate || null,
        service_type: form.serviceType || "Standard",
        seller_id: sellerId,
        created_by: profile.id,
        progress: 5,
      })
      .select("id, reference, tracking_number")
      .single();

    if (error) return fail(error.message);

    // Seed the tracking timeline's first event.
    await supabase.from("shipment_tracking_logs").insert({
      shipment_id: data.id,
      event_type: "booking",
      level: "info",
      message: "Parcel registered",
      location: form.origin,
      status: "Registered",
      created_by: profile.id,
    });

    serverLog.info("parcels.create", { tracking_number: data.tracking_number });

    // Sellers may attach a REGISTERED customer account by email via the
    // authorization-checked RPC (staff already resolved client_id directly).
    let warning: string | undefined;
    if (isSellerRole(profile.role) && form.customerEmail) {
      const attach = await supabase.rpc("attach_parcel_customer", {
        p_parcel_id: data.id,
        p_customer_email: form.customerEmail,
      });
      const result = attach.data as { ok: boolean; error?: string } | null;
      if (attach.error || !result?.ok) {
        warning =
          result?.error ??
          "Parcel registered, but the recipient account could not be attached.";
        serverLog.warn("parcels.attachCustomer", { err: warning });
      }
    }

    revalidatePath("/parcels");
    revalidatePath("/dashboard");
    return ok({
      id: data.id,
      trackingNumber: data.tracking_number ?? "",
      reference: data.reference,
      ...(warning ? { warning } : {}),
    });
  });
}

/** Status change: validated, atomic, notifies seller + customer. */
export async function updateParcelStatus(
  input: unknown,
): Promise<ActionResult> {
  return runAction("parcels.updateStatus", parcelStatusSchema, input, async (form) => {
    const check = await checkPermission("parcels.updateStatus");
    if ("error" in check) return fail("Only operations staff can change parcel status");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("update_parcel_status", {
      p_parcel_id: form.parcelId,
      p_status: form.status,
      p_location: form.location || null,
      p_hub_id: form.hubId || null,
      p_description: form.description || null,
    });

    const result = data as { ok: boolean; error?: string } | null;
    if (error || !result?.ok) {
      return fail(result?.error ?? error?.message ?? "Status update failed");
    }

    serverLog.info("parcels.updateStatus", {
      parcelId: form.parcelId,
      status: form.status,
      actor: check.profile.id,
    });
    revalidatePath(`/parcels/${form.parcelId}`);
    revalidatePath("/parcels");
    revalidatePath("/dashboard");
    return okVoid();
  });
}

/** Admin/staff: update the parcel's current hub / free-text location. */
export async function updateParcelLocation(
  input: unknown,
): Promise<ActionResult> {
  return runAction("parcels.updateLocation", parcelLocationSchema, input, async (form) => {
    const check = await checkPermission("hubs.manage");
    if ("error" in check) {
      return fail("Only operations staff can move parcels between facilities");
    }

    const supabase = await createClient();

    let locationLabel = form.location || null;
    if (form.hubId && !locationLabel) {
      const { data: hub } = await supabase
        .from("hubs")
        .select("name")
        .eq("id", form.hubId)
        .maybeSingle();
      locationLabel = hub?.name ?? null;
    }

    const { error } = await supabase
      .from("shipments")
      .update({
        current_hub_id: form.hubId || null,
        current_location: locationLabel,
      })
      .eq("id", form.parcelId);
    if (error) return fail(error.message);

    // Location moves appear on the timeline as an event too.
    await supabase.from("shipment_tracking_logs").insert({
      shipment_id: form.parcelId,
      event_type: "location",
      level: "info",
      message: `Current location set to ${locationLabel ?? "unassigned"}`,
      location: locationLabel,
      created_by: check.profile.id,
    });

    serverLog.info("parcels.updateLocation", { parcelId: form.parcelId });
    revalidatePath(`/parcels/${form.parcelId}`);
    revalidatePath("/dashboard");
    return okVoid();
  });
}

/** Seller edits own parcel details while it is still Registered. */
export async function editOwnParcel(input: unknown): Promise<ActionResult> {
  return runAction("parcels.editOwn", parcelEditSchema, input, async (form) => {
    const profile = await requireProfile();
    if (!isSellerRole(profile.role)) {
      return fail("Only the selling account can edit a registered parcel");
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("shipments")
      .update({
        consignee: form.consignee,
        client_name: form.consignee,
        recipient_phone: form.recipientPhone || null,
        description: form.description || null,
        weight_kg: form.weightKg,
      })
      .eq("id", form.parcelId);
    if (error) return fail(error.message);

    revalidatePath(`/parcels/${form.parcelId}`);
    return okVoid();
  });
}

/** Cancel a parcel with a reason (staff). */
export async function cancelParcel(
  input: unknown,
): Promise<ActionResult> {
  return runAction("parcels.cancel", cancelParcelSchema, input, async (form) => {
    const check = await checkPermission("parcels.updateStatus");
    if ("error" in check) return fail("Only operations staff can cancel parcels");

    const supabase = await createClient();

    const rpc = await supabase.rpc("update_parcel_status", {
      p_parcel_id: form.shipmentId,
      p_status: "Cancelled",
      p_description: `Parcel cancelled: ${form.cancelReason}`,
    });
    const result = rpc.data as { ok: boolean; error?: string } | null;
    if (rpc.error || !result?.ok) {
      return fail(result?.error ?? rpc.error?.message ?? "Cancellation failed");
    }

    await supabase
      .from("shipments")
      .update({ cancel_reason: form.cancelReason })
      .eq("id", form.shipmentId);

    revalidatePath(`/parcels/${form.shipmentId}`);
    revalidatePath("/parcels");
    return okVoid();
  });
}
