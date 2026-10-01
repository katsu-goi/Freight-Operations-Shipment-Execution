import { describe, it, expect } from "vitest";
import {
  generateTrackingToken,
  hashTrackingToken,
  isValidTrackingTokenFormat,
  buildTrackingLinkPath,
  canManageParcelLink,
  INVALID_TRACKING_LINK_MESSAGE,
} from "@/lib/trackingLinks";
import { isPublicPath } from "@/lib/supabase/middleware";

describe("tracking token generation", () => {
  it("produces 43-char URL-safe tokens with 256-bit entropy", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const t = generateTrackingToken();
      expect(t).toHaveLength(43);
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(t).not.toContain("+");
      expect(t).not.toContain("/");
      expect(t).not.toContain("=");
      seen.add(t);
    }
    expect(seen.size).toBe(100);
  });

  it("hashes to SHA-256 hex and never contains the raw token", () => {
    const token = generateTrackingToken();
    const h1 = hashTrackingToken(token);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(hashTrackingToken(token)).toBe(h1);
    expect(hashTrackingToken(generateTrackingToken())).not.toBe(h1);
    expect(h1).not.toContain(token.slice(0, 8));
  });

  it("validates the token shape before any lookup", () => {
    expect(isValidTrackingTokenFormat(generateTrackingToken())).toBe(true);
    expect(isValidTrackingTokenFormat("")).toBe(false);
    expect(isValidTrackingTokenFormat("short")).toBe(false);
    expect(isValidTrackingTokenFormat("A".repeat(44))).toBe(false);
    // Parcel UUIDs / tracking numbers must never pass as tokens.
    expect(isValidTrackingTokenFormat("123e4567-e89b-12d3-a456-426614174000")).toBe(false);
    expect(isValidTrackingTokenFormat("PKG-2026-000001")).toBe(false);
    expect(isValidTrackingTokenFormat("../admin/dashboard")).toBe(false);
  });

  it("builds token-only public URLs with no parcel ID", () => {
    const token = generateTrackingToken();
    const path = buildTrackingLinkPath(token);
    expect(path).toBe(`/t/${token}`);
    expect(path.startsWith("/t/")).toBe(true);
  });
});

describe("tracking link error uniformity", () => {
  it("uses one generic message for every failure mode", () => {
    expect(INVALID_TRACKING_LINK_MESSAGE).toBe(
      "This tracking link is invalid or has expired.",
    );
    // Must not hint at which failure occurred.
    expect(INVALID_TRACKING_LINK_MESSAGE).not.toMatch(/revoked|not found|no parcel/i);
  });
});

describe("tracking link ownership gate", () => {
  const own = {
    role: "Seller",
    profileSellerId: "seller-1",
    parcelSellerId: "seller-1",
  };

  it("allows the owning seller", () => {
    expect(canManageParcelLink(own)).toBe(true);
  });

  it("blocks other roles, strangers, and unlinked accounts", () => {
    expect(canManageParcelLink({ ...own, role: "Admin" })).toBe(false);
    expect(canManageParcelLink({ ...own, role: "Customer" })).toBe(false);
    expect(
      canManageParcelLink({ ...own, parcelSellerId: "seller-2" }),
    ).toBe(false);
    expect(
      canManageParcelLink({ ...own, profileSellerId: null }),
    ).toBe(false);
    expect(
      canManageParcelLink({ ...own, parcelSellerId: null }),
    ).toBe(false);
    expect(
      canManageParcelLink({ role: "Seller", profileSellerId: null, parcelSellerId: null }),
    ).toBe(false);
  });
});

describe("public tracking route visibility", () => {
  it("exposes /t/<token> without authentication", () => {
    expect(isPublicPath("/t")).toBe(true);
    expect(isPublicPath(`/t/${generateTrackingToken()}`)).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
  });

  it("keeps protected routes behind authentication", () => {
    for (const p of [
      "/admin/dashboard",
      "/admin/users",
      "/seller/dashboard",
      "/parcels",
      "/parcels/new",
      "/track",
      "/dashboard",
      "/handover",
      "/manifest",
      "/notifications",
    ]) {
      expect(isPublicPath(p)).toBe(false);
    }
    // Prefix guard must not leak siblings of /t.
    expect(isPublicPath("/track")).toBe(false);
    expect(isPublicPath("/track/abc")).toBe(false);
  });
});
