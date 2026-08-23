import type { AppRole } from "@/types";

/**
 * Centralized Role-Based Access Control.
 *
 * Every server action, page gate, and API route must authorize through this
 * module — role checks are never duplicated inline and never trusted from the
 * client. The role always comes from `profiles.role` in the database
 * (see lib/auth.ts), never from user metadata or request payloads.
 *
 * Canonical tiers:
 *   ADMIN    -> Admin (full system access)
 *   OPS      -> Dispatcher / Planner (legacy operations staff; treated as
 *               admin-level operators for backward compatibility)
 *   SELLER   -> Seller (client sending parcels)
 *   CUSTOMER -> Customer / legacy Client alias (recipient)
 *   CARRIER  -> Carrier (legacy assigned-loads view)
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

/** Legacy operations roles kept working alongside Admin. */
const OPS_STAFF_ROLES: AppRole[] = ["Dispatcher", "Planner"];
const STAFF_ROLES: AppRole[] = [...ADMIN_ROLES, ...OPS_STAFF_ROLES];

/** Permission matrix. One entry per permission — no scattered role checks. */
const PERMISSIONS: Record<Permission, AppRole[]> = {
  "sellers.manage": STAFF_ROLES,
  "customers.view": STAFF_ROLES,
  "parcels.viewAll": STAFF_ROLES,
  "parcels.create": [...STAFF_ROLES, "Seller"],
  "parcels.updateStatus": ["Admin", "Dispatcher", "Planner"],
  "hubs.manage": STAFF_ROLES,
  "audit.view": ADMIN_ROLES,
  "settings.manage": ADMIN_ROLES,
};

export function can(role: AppRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/** Canonical tier label used for display + coarse gates. */
export type RoleTier = "ADMIN" | "SELLER" | "CUSTOMER" | "CARRIER" | "STAFF";

export function roleTier(role: AppRole): RoleTier {
  switch (role) {
    case "Admin":
      return "ADMIN";
    case "Seller":
      return "SELLER";
    case "Customer":
    case "Client":
      return "CUSTOMER";
    case "Carrier":
      return "CARRIER";
    default:
      return "STAFF";
  }
}

export function isAdminRole(role: AppRole): boolean {
  return role === "Admin";
}

/** Staff (Admin/Dispatcher) — full write access to operational data. */
export function isStaffRole(role: AppRole): boolean {
  return STAFF_ROLES.includes(role);
}

/** Ops staff incl. Planner (read-heavy operations visibility). */
export function isOpsStaffRole(role: AppRole): boolean {
  return STAFF_ROLES.includes(role);
}

/** Seller-tier account (sends parcels through the hub). */
export function isSellerRole(role: AppRole): boolean {
  return role === "Seller";
}

/** Customer-tier account (receives parcels). 'Client' is a legacy alias. */
export function isCustomerRole(role: AppRole): boolean {
  return role === "Customer" || role === "Client";
}

export function canCreateParcels(role: AppRole): boolean {
  return can(role, "parcels.create");
}

export function canUpdateParcelStatus(role: AppRole): boolean {
  return can(role, "parcels.updateStatus");
}
