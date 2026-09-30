import { describe, it, expect } from "vitest";
import { parseAppRole, isStaff, isOps, canApproveLoadPlans, canPostTracking } from "@/lib/roles";

describe("parseAppRole", () => {
  it("accepts only the defined enum roles", () => {
    expect(parseAppRole("SuperAdmin")).toBe("SuperAdmin");
    expect(parseAppRole("Admin")).toBe("Admin");
    expect(parseAppRole("Seller")).toBe("Seller");
    expect(parseAppRole("Customer")).toBe("Customer");
    expect(parseAppRole("Citizen")).toBe("Citizen");
    expect(parseAppRole("super admin")).toBe("SuperAdmin");
    expect(parseAppRole("other user")).toBe("Citizen");
    expect(parseAppRole("Dispatcher")).toBeNull(); // removed role
    expect(parseAppRole("Planner")).toBeNull(); // removed role
    expect(parseAppRole("Carrier")).toBeNull(); // removed role
    expect(parseAppRole(42)).toBeNull();
    expect(parseAppRole(null)).toBeNull();
  });
});

describe("role predicates (consolidated)", () => {
  it("isStaff is SuperAdmin + Admin", () => {
    expect(isStaff("SuperAdmin")).toBe(true);
    expect(isStaff("Admin")).toBe(true);
    expect(isStaff("Seller")).toBe(false);
    expect(isStaff("Customer")).toBe(false);
    expect(isStaff("Citizen")).toBe(false);
  });

  it("isOps is SuperAdmin + Admin after expansion", () => {
    expect(isOps("SuperAdmin")).toBe(true);
    expect(isOps("Admin")).toBe(true);
  });

  it("only staff can approve load plans", () => {
    expect(canApproveLoadPlans("SuperAdmin")).toBe(true);
    expect(canApproveLoadPlans("Admin")).toBe(true);
    expect(canApproveLoadPlans("Seller")).toBe(false);
  });

  it("only admin may post legacy tracking updates", () => {
    expect(canPostTracking("SuperAdmin")).toBe(true);
    expect(canPostTracking("Admin")).toBe(true);
    expect(canPostTracking("Customer")).toBe(false);
    expect(canPostTracking("Citizen")).toBe(false);
    expect(canPostTracking("Seller")).toBe(false);
  });
});
