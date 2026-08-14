import type { AppRole } from "@/types";

export const ALL_ROLES: AppRole[] = [
  "Admin",
  "Dispatcher",
  "Planner",
  "Carrier",
  "Client",
];

export function parseAppRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return (ALL_ROLES as string[]).includes(value) ? (value as AppRole) : null;
}

/** Admin + Dispatcher — final writes / approvals. */
export function isStaff(role: AppRole): boolean {
  return role === "Admin" || role === "Dispatcher";
}

/** Staff + Planner — ops visibility and carrier batching drafts. */
export function isOps(role: AppRole): boolean {
  return isStaff(role) || role === "Planner";
}

/** Maker–checker: only staff may approve/reject load plans. */
export function canApproveLoadPlans(role: AppRole): boolean {
  return isStaff(role);
}

/** Final sign-off on carrier handovers. */
export function canFinalizeHandover(role: AppRole): boolean {
  return isStaff(role);
}

/** Live tracking posts: staff or assigned carrier (legacy GPS feed). */
export function canPostTracking(role: AppRole): boolean {
  return isStaff(role) || role === "Carrier";
}

export const OPS_ROLES: AppRole[] = ["Admin", "Dispatcher", "Planner"];
export const STAFF_ROLES: AppRole[] = ["Admin", "Dispatcher"];
