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
  });

  it("sellers can create parcels but never manage the system", () => {
    expect(can("Seller", "parcels.create")).toBe(true);
    expect(can("Seller", "sellers.manage")).toBe(false);
    expect(can("Seller", "customers.view")).toBe(false);
    expect(can("Seller", "audit.view")).toBe(false);
    expect(can("Seller", "settings.manage")).toBe(false);
    expect(can("Seller", "hubs.manage")).toBe(false);
  });

  it("sellers cannot change parcel status — staff only", () => {
    expect(can("Seller", "parcels.updateStatus")).toBe(false);
    expect(can("Customer", "parcels.updateStatus")).toBe(false);
    expect(can("Dispatcher", "parcels.updateStatus")).toBe(true);
    expect(can("Planner", "parcels.updateStatus")).toBe(true);
  });

  it("customers have no administrative permissions at all", () => {
    const adminOnly = [
      "sellers.manage",
      "customers.view",
      "parcels.viewAll",
      "hubs.manage",
      "audit.view",
      "settings.manage",
      "parcels.updateStatus",
    ] as const;
    for (const perm of adminOnly) {
      expect(can("Customer", perm)).toBe(false);
      expect(can("Client", perm)).toBe(false);
    }
    // Customers also cannot create parcels.
    expect(can("Customer", "parcels.create")).toBe(false);
    expect(can("Client", "parcels.create")).toBe(false);
  });
});

describe("role tiers & predicates", () => {
  it("maps roles onto canonical tiers", () => {
    expect(roleTier("Admin")).toBe("ADMIN");
    expect(roleTier("Seller")).toBe("SELLER");
    expect(roleTier("Customer")).toBe("CUSTOMER");
    expect(roleTier("Client")).toBe("CUSTOMER"); // legacy alias
    expect(roleTier("Carrier")).toBe("CARRIER");
    expect(roleTier("Dispatcher")).toBe("STAFF");
  });

  it("customer predicate treats Client as legacy alias", () => {
    expect(isCustomerRole("Customer")).toBe(true);
    expect(isCustomerRole("Client")).toBe(true);
    expect(isCustomerRole("Seller")).toBe(false);
  });

  it("seller/staff/admin predicates", () => {
    expect(isSellerRole("Seller")).toBe(true);
    expect(isAdminRole("Admin")).toBe(true);
    expect(isStaffRole("Planner")).toBe(true);
    expect(isStaffRole("Seller")).toBe(false);
  });

  it("parseAppRole accepts the new roles and rejects junk", () => {
    expect(parseAppRole("Seller")).toBe("Seller");
    expect(parseAppRole("Customer")).toBe("Customer");
    expect(parseAppRole("SuperAdmin")).toBeNull();
  });
});
