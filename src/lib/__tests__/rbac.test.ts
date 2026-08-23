import { describe, it, expect } from "vitest";
import {
  can,
  roleTier,
  isAdminRole,
  isStaffRole,
  isSellerRole,
  isCustomerRole,
} from "@/lib/rbac";
import { parseAppRole } from "@/lib/roles";

describe("rbac permission matrix", () => {
  it("admin has every permission", () => {
    expect(can("Admin", "sellers.manage")).toBe(true);
    expect(can("Admin", "audit.view")).toBe(true);
    expect(can("Admin", "settings.manage")).toBe(true);
    expect(can("Admin", "parcels.updateStatus")).toBe(true);
    expect(can("Admin", "parcels.create")).toBe(true);
    expect(can("Admin", "hubs.manage")).toBe(true);
  });

  it("sellers can create parcels but never manage the system", () => {
    expect(can("Seller", "parcels.create")).toBe(true);
    expect(can("Seller", "sellers.manage")).toBe(false);
    expect(can("Seller", "customers.view")).toBe(false);
    expect(can("Seller", "audit.view")).toBe(false);
    expect(can("Seller", "settings.manage")).toBe(false);
    expect(can("Seller", "hubs.manage")).toBe(false);
    expect(can("Seller", "parcels.updateStatus")).toBe(false);
  });

  it("customers have no administrative permissions at all", () => {
    const adminOnly = [
      "sellers.manage",
      "customers.view",
      "parcels.viewAll",
      "parcels.updateStatus",
      "hubs.manage",
      "audit.view",
      "settings.manage",
      "parcels.create",
    ] as const;
    for (const perm of adminOnly) {
      expect(can("Customer", perm)).toBe(false);
    }
  });

  it("carriers have no administrative permissions", () => {
    expect(parseAppRole("Carrier")).toBeNull();
    expect(roleTier("Admin")).toBe("ADMIN");
    expect(roleTier("Seller")).toBe("SELLER");
    expect(roleTier("Customer")).toBe("CUSTOMER");
  });
});

describe("role tiers & predicates", () => {
  it("maps roles onto canonical tiers", () => {
    expect(roleTier("Admin")).toBe("ADMIN");
    expect(roleTier("Seller")).toBe("SELLER");
    expect(roleTier("Customer")).toBe("CUSTOMER");
  });

  it("predicates are exact-match on the canonical roles", () => {
    expect(isCustomerRole("Customer")).toBe(true);
    expect(isCustomerRole("Seller")).toBe(false);
    expect(isSellerRole("Seller")).toBe(true);
    expect(isAdminRole("Admin")).toBe(true);
    expect(isStaffRole("Admin")).toBe(true);
    // Removed roles are rejected outright.
    for (const r of ["Admin", "Seller", "Customer"] as const) {
      expect(parseAppRole(r)).toBe(r);
    }
    expect(parseAppRole("Dispatcher")).toBeNull();
    expect(parseAppRole("Planner")).toBeNull();
    expect(parseAppRole("Client")).toBeNull();
    expect(parseAppRole("Carrier")).toBeNull();
    expect(parseAppRole("SuperAdmin")).toBeNull();
  });
});
