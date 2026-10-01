import { createHash, randomBytes } from "node:crypto";

/**
 * Customer tracking-link token helpers.
 *
 * Pure functions (no Supabase import) shared by the seller link actions, the
 * public tracking page, and unit tests. Storage + verification live in the
 * `parcel_tracking_links` table (hashes only) and the
 * `get_parcel_by_tracking_token()` RPC — see
 * supabase/migrations/20260930_parcel_tracking_links.sql.
 *
 * The raw token is generated here, hashed before storage, and returned to
 * the seller exactly once. It is never logged and never persisted raw.
 */

/** Uniform message for missing/invalid/expired/revoked links (no probing). */
export const INVALID_TRACKING_LINK_MESSAGE =
  "This tracking link is invalid or has expired.";

/** 32 CSPRNG bytes → URL-safe base64 (43 chars, 256-bit entropy). */
export function generateTrackingToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest — the only form ever stored in the database. */
export function hashTrackingToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Shape check before hashing/lookup (rejects tampered IDs early). */
export function isValidTrackingTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** Public path for a token. The URL carries no parcel/database ID. */
export function buildTrackingLinkPath(token: string): string {
  return `/t/${token}`;
}

export interface LinkOwnerContext {
  role: string;
  profileSellerId: string | null;
  parcelSellerId: string | null;
}

/**
 * Seller-ownership gate for link management. Only the owning Seller account
 * may generate/revoke/regenerate links for a parcel — enforced again
 * server-side in the action (never trust the browser's parcel ID alone).
 */
export function canManageParcelLink(ctx: LinkOwnerContext): boolean {
  return (
    ctx.role === "Seller" &&
    ctx.profileSellerId !== null &&
    ctx.parcelSellerId !== null &&
    ctx.profileSellerId === ctx.parcelSellerId
  );
}
