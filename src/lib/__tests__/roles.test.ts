import { describe, it, expect } from "vitest";
import {
  parseAppRole,
  isStaff,
  isOps,
  canApproveLoadPlans,
  canPostTracking,
} from "@/lib/roles";

describe("parseAppRole", () => {
  it("accepts only the defined enum roles", () => {
    expect(parseAppRole("Admin")).toBe("Admin");
    expect(parseAppRole("Carrier")).toBe("Carrier");
    expect(parseAppRole("GodMode")).toBeNull();
    expect(parseAppRole(42)).toBeNull();
    expect(parseAppRole(null)).toBeNull();
  });
});

describe("role predicates", () => {
  it("isStaff is Admin/Dispatcher only", () => {
    expect(isStaff("Admin")).toBe(true);
    expect(isStaff("Dispatcher")).toBe(true);
    expect(isStaff("Planner")).toBe(false);
    expect(isStaff("Carrier")).toBe(false);
    expect(isStaff("Client")).toBe(false);
  });

  it("isOps includes Planner", () => {
    expect(isOps("Planner")).toBe(true);
    expect(isOps("Carrier")).toBe(false);
  });

  it("only staff can approve load plans", () => {
    expect(canApproveLoadPlans("Admin")).toBe(true);
    expect(canApproveLoadPlans("Dispatcher")).toBe(true);
    expect(canApproveLoadPlans("Planner")).toBe(false);
  });

  it("staff and carrier may post tracking updates", () => {
    expect(canPostTracking("Admin")).toBe(true);
    expect(canPostTracking("Carrier")).toBe(true);
    expect(canPostTracking("Client")).toBe(false);
    expect(canPostTracking("Planner")).toBe(false);
  });
});