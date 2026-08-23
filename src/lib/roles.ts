import type { AppRole } from "@/types";
import { isStaffRole, isOpsStaffRole } from "@/lib/rbac";

export const ALL_ROLES: AppRole[] = ["Admin", "Seller", "Customer"];

export function parseAppRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return (ALL_ROLES as string[]).includes(value) ? (value as AppRole) : null;
}

export {
  isAdminRole,
  isStaffRole,
  isOpsStaffRole,
  isSellerRole,
  isCustomerRole,
  can,
  canCreateParcels,
  canUpdateParcelStatus,
  roleTier,
} from "@/lib/rbac";
export type { Permission } from "@/lib/rbac";

/** Legacy aliases — kept so existing call sites continue to work.
 *  Semantics match the database helpers exactly (Admin-only staff). */

/** Admin — full operational writes. */
export function isStaff(role: AppRole): boolean {
  return role === "Admin";
}

/** Admin (historically included Planner; ops roles were consolidated). */
export function isOps(role: AppRole): boolean {
  return isStaffRole(role);
}

/** Maker–checker: only staff may approve/reject load plans. */
export function canApproveLoadPlans(role: AppRole): boolean {
  return isStaff(role);
}

/** Final sign-off on carrier handovers. */
export function canFinalizeHandover(role: AppRole): boolean {
  return isStaff(role);
}

/** Live tracking posts (legacy GPS feed): admin only. */
export function canPostTracking(role: AppRole): boolean {
  return isStaff(role);
}

export const OPS_ROLES: AppRole[] = ["Admin"];
export const STAFF_ROLES: AppRole[] = ["Admin"];
