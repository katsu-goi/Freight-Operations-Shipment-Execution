import type { AppRole } from "@/types";

/**
 * Centralized Role-Based Access Control.
 *
 * Canonical tiers (consolidated):
 *   ADMIN    -> Admin (full system access)
 *   SELLER   -> Seller (client sending parcels)
 *   CUSTOMER -> Customer (recipient)
 *
 * Every server action, page gate, and API route must authorize through this
 * module. The role always comes from `profiles.role` in the database
 * (see lib/auth.ts), never from user metadata or request payloads.
 */

export type Permission =
  /** View/manage all sellers: table, add/edit/archive/restore/delete. */
  | "sellers.manage"
  /** Read-only access to the customer directory. */
  | "customers.view"
  /** See parcels across the whole system. */
  | "parcels.viewAll"
  /** Register new parcels. */
  | "parcels.create"
  /** Change parcel status/location (drives tracking + notifications). */
  | "parcels.updateStatus"
  /** Manage hubs/facilities. */
  | "hubs.manage"
  /** Read the audit log. */
  | "audit.view"
  /** Manage system settings. */
  | "settings.manage";

/** Roles with full administrative power. */
const ADMIN_ROLES: AppRole[] = ["Admin"];

/** Permission matrix. One entry per permission — no scattered role checks. */
const PERMISSIONS: Record<Permission, AppRole[]> = {
  "sellers.manage": ADMIN_ROLES,
  "customers.view": ADMIN_ROLES,
  "parcels.viewAll": ADMIN_ROLES,
  "parcels.create": [...ADMIN_ROLES, "Seller"],
  "parcels.updateStatus": ADMIN_ROLES,
  "hubs.manage": ADMIN_ROLES,
  "audit.view": ADMIN_ROLES,
  "settings.manage": ADMIN_ROLES,
};

export function can(role: AppRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/** Canonical tier label used for display + coarse gates. */
export type RoleTier = "ADMIN" | "SELLER" | "CUSTOMER";

export function roleTier(role: AppRole): RoleTier {
  switch (role) {
    case "Admin":
      return "ADMIN";
    case "Seller":
      return "SELLER";
    case "Customer":
      return "CUSTOMER";
  }
}

export function isAdminRole(role: AppRole): boolean {
  return role === "Admin";
}

/** Admin — full write access to operational data. */
export function isStaffRole(role: AppRole): boolean {
  return role === "Admin";
}

export function isOpsStaffRole(role: AppRole): boolean {
  return isStaffRole(role);
}

/** Seller-tier account (sends parcels through the hub). */
export function isSellerRole(role: AppRole): boolean {
  return role === "Seller";
}

/** Customer-tier account (receives parcels). */
export function isCustomerRole(role: AppRole): boolean {
  return role === "Customer";
}

export function canCreateParcels(role: AppRole): boolean {
  return can(role, "parcels.create");
}

export function canUpdateParcelStatus(role: AppRole): boolean {
  return can(role, "parcels.updateStatus");
}
