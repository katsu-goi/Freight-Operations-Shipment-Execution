import { describe, it, expect } from "vitest";
import { parseAppRole, isStaff, isOps, canApproveLoadPlans, canPostTracking } from "@/lib/roles";

describe("parseAppRole", () => {
  it("accepts only the defined enum roles", () => {
    expect(parseAppRole("Admin")).toBe("Admin");
    expect(parseAppRole("Seller")).toBe("Seller");
    expect(parseAppRole("Customer")).toBe("Customer");
    expect(parseAppRole("Dispatcher")).toBeNull(); // removed role
    expect(parseAppRole("Planner")).toBeNull(); // removed role
    expect(parseAppRole("Client")).toBeNull(); // removed role
    expect(parseAppRole("Carrier")).toBeNull(); // removed role
    expect(parseAppRole(42)).toBeNull();
    expect(parseAppRole(null)).toBeNull();
  });
});

describe("role predicates (consolidated)", () => {
  it("isStaff is Admin only", () => {
    expect(isStaff("Admin")).toBe(true);
    expect(isStaff("Seller")).toBe(false);
    expect(isStaff("Customer")).toBe(false);
  });

  it("isOps is Admin only after consolidation", () => {
    expect(isOps("Admin")).toBe(true);
  });

  it("only staff can approve load plans", () => {
    expect(canApproveLoadPlans("Admin")).toBe(true);
    expect(canApproveLoadPlans("Seller")).toBe(false);
  });

  it("only admin may post legacy tracking updates", () => {
    expect(canPostTracking("Admin")).toBe(true);
    expect(canPostTracking("Customer")).toBe(false);
    expect(canPostTracking("Seller")).toBe(false);
  });
});
