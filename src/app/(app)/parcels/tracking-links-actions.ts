"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { runAction, ok, okVoid, fail, type ActionResult } from "@/lib/actions/result";
import {
  trackingLinkCreateSchema,
  trackingLinkRevokeSchema,
  trackingLinkRegenerateSchema,
} from "@/lib/validation/schemas";
import {
  generateTrackingToken,
  hashTrackingToken,
  buildTrackingLinkPath,
  canManageParcelLink,
} from "@/lib/trackingLinks";
import { serverLog } from "@/lib/server/log";

/**
 * Seller-generated customer tracking links.
 *
 * Every action verifies parcel ownership server-side against the DB-backed
 * profile (`profiles.seller_id`) — the browser-supplied parcel/link ID is
 * never trusted alone. Raw tokens exist only in memory: they are hashed
 * before storage, returned to the generating seller exactly once, and never
 * logged. Link rows live in a policy-less RLS table, so all reads/writes
 * here use the service-role client (server-only, never the browser).
 */

export interface TrackingLinkCreated {
  linkId: string;
  /** Public path (e.g. /t/<token>); the client prefixes its own origin. */
  path: string;
  /** Raw token — shown to the seller once, never stored or logged. */
  token: string;
  createdAt: string;
}

export interface TrackingLinkRow {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

/** Load a parcel's seller (RLS-scoped) for the ownership gate. */
async function getParcelOwner(parcelId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("seller_id")
    .eq("id", parcelId)
    .maybeSingle();
  return (data?.seller_id as string | null) ?? null;
}

function expiryFromDays(days: number | null | undefined): string | null {
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Generate a private tracking link for one of the seller's own parcels. */
export async function createTrackingLink(
  input: unknown,
): Promise<ActionResult<TrackingLinkCreated>> {
  return runAction("trackingLinks.create", trackingLinkCreateSchema, input, async (form) => {
    const profile = await requireProfile();
    const parcelSellerId = await getParcelOwner(form.parcelId);
    if (!parcelSellerId) return fail("Parcel not found");
    if (!canManageParcelLink({ role: profile.role, profileSellerId: profile.seller_id, parcelSellerId })) {
      return fail("You can only share tracking links for your own parcels");
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return fail("Tracking service is not configured. Please try again later.");
    }

    const token = generateTrackingToken();
    const { data, error } = await admin
      .from("parcel_tracking_links")
      .insert({
        parcel_id: form.parcelId,
        token_hash: hashTrackingToken(token),
        label: form.label || "",
        created_by: profile.id,
        expires_at: expiryFromDays(form.expiresInDays),
      })
      .select("id, created_at")
      .single();
    if (error || !data) return fail(error?.message ?? "Could not create the tracking link");

    // Audit without secrets: link id only — never the raw token.
    serverLog.info("trackingLinks.create", { linkId: data.id, parcelId: form.parcelId });
    revalidatePath(`/parcels/${form.parcelId}`);
    return ok({
      linkId: data.id,
      path: buildTrackingLinkPath(token),
      token,
      createdAt: data.created_at,
    });
  });
}

/** List a parcel's links (metadata only — never hashes or raw tokens). */
export async function listParcelLinks(
  parcelId: string,
): Promise<ActionResult<TrackingLinkRow[]>> {
  const profile = await requireProfile();
  const parcelSellerId = await getParcelOwner(parcelId);
  if (!parcelSellerId) return fail("Parcel not found");
  if (!canManageParcelLink({ role: profile.role, profileSellerId: profile.seller_id, parcelSellerId })) {
    return fail("You can only view tracking links for your own parcels");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Tracking service is not configured. Please try again later.");
  }
  const { data, error } = await admin
    .from("parcel_tracking_links")
    .select("id, label, created_at, expires_at, revoked_at")
    .eq("parcel_id", parcelId)
    .order("created_at", { ascending: false });
  if (error) return fail(error.message);
  return ok(
    (data ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      revokedAt: r.revoked_at,
    })),
  );
}

/** Revoke one of the seller's own parcel links (customers see the generic expired message). */
export async function revokeTrackingLink(
  input: unknown,
): Promise<ActionResult> {
  return runAction("trackingLinks.revoke", trackingLinkRevokeSchema, input, async (form) => {
    const profile = await requireProfile();
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return fail("Tracking service is not configured. Please try again later.");
    }

    const { data: link } = await admin
      .from("parcel_tracking_links")
      .select("id, parcel_id")
      .eq("id", form.linkId)
      .maybeSingle();
    if (!link) return fail("Tracking link not found");
    const parcelSellerId = await getParcelOwner(link.parcel_id);
    if (!parcelSellerId) return fail("Tracking link not found");
    if (!canManageParcelLink({ role: profile.role, profileSellerId: profile.seller_id, parcelSellerId })) {
      return fail("You can only revoke tracking links for your own parcels");
    }

    const { error } = await admin
      .from("parcel_tracking_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", form.linkId)
      .is("revoked_at", null);
    if (error) return fail(error.message);

    serverLog.info("trackingLinks.revoke", { linkId: form.linkId });
    revalidatePath(`/parcels/${link.parcel_id}`);
    return okVoid();
  });
}

/**
 * Regenerate: revoke the previous link FIRST, then issue a fresh token.
 * The old URL stops working immediately; the new raw token is returned once.
 */
export async function regenerateTrackingLink(
  input: unknown,
): Promise<ActionResult<TrackingLinkCreated>> {
  return runAction("trackingLinks.regenerate", trackingLinkRegenerateSchema, input, async (form) => {
    const profile = await requireProfile();
    const parcelSellerId = await getParcelOwner(form.parcelId);
    if (!parcelSellerId) return fail("Parcel not found");
    if (!canManageParcelLink({ role: profile.role, profileSellerId: profile.seller_id, parcelSellerId })) {
      return fail("You can only share tracking links for your own parcels");
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return fail("Tracking service is not configured. Please try again later.");
    }

    const { data: previous } = await admin
      .from("parcel_tracking_links")
      .select("id, parcel_id")
      .eq("id", form.linkId)
      .maybeSingle();
    if (!previous || previous.parcel_id !== form.parcelId) {
      return fail("Tracking link not found");
    }

    // Revoke first so at most one live token exists per regeneration.
    await admin
      .from("parcel_tracking_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", form.linkId)
      .is("revoked_at", null);

    const token = generateTrackingToken();
    const { data, error } = await admin
      .from("parcel_tracking_links")
      .insert({
        parcel_id: form.parcelId,
        token_hash: hashTrackingToken(token),
        label: form.label || "",
        created_by: profile.id,
        expires_at: expiryFromDays(form.expiresInDays),
      })
      .select("id, created_at")
      .single();
    if (error || !data) return fail(error?.message ?? "Could not regenerate the tracking link");

    serverLog.info("trackingLinks.regenerate", { linkId: data.id, parcelId: form.parcelId });
    revalidatePath(`/parcels/${form.parcelId}`);
    return ok({
      linkId: data.id,
      path: buildTrackingLinkPath(token),
      token,
      createdAt: data.created_at,
    });
  });
}
