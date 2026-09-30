import type { AppRole } from "@/types";

/**
 * Centralized Role-Based Access Control.
 *
 * Canonical tiers (expanded per core requirements):
 *   SUPERADMIN -> SuperAdmin (full system access + user/role management)
 *   ADMIN      -> Admin (full operations access)
 *   SELLER     -> Seller (business sender — "other user" type that ships parcels)
 *   CUSTOMER   -> Customer (recipient)
 *   CITIZEN    -> Citizen (public/citizen portal — same data tier as Customer)
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
  | "settings.manage"
  /** Manage users & assign roles (SuperAdmin only). */
  | "users.manage"
  /** View operational reports. */
  | "reports.view"
  /** Export reports to CSV/PDF. */
  | "reports.export"
  /** View data analytics dashboards. */
  | "analytics.view"
  /** Submit training examples / run AI training jobs. */
  | "ai.train";

/** Roles with full administrative power (ops + system config). */
const ADMIN_ROLES: AppRole[] = ["SuperAdmin", "Admin"];

/** SuperAdmin-only powers. */
const SUPERADMIN_ROLES: AppRole[] = ["SuperAdmin"];

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
  "users.manage": SUPERADMIN_ROLES,
  "reports.view": ADMIN_ROLES,
  "reports.export": ADMIN_ROLES,
  "analytics.view": ADMIN_ROLES,
  "ai.train": ADMIN_ROLES,
};

export function can(role: AppRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/** Canonical tier label used for display + coarse gates. */
export type RoleTier = "SUPERADMIN" | "ADMIN" | "SELLER" | "CUSTOMER" | "CITIZEN";

export function roleTier(role: AppRole): RoleTier {
  switch (role) {
    case "SuperAdmin":
      return "SUPERADMIN";
    case "Admin":
      return "ADMIN";
    case "Seller":
      return "SELLER";
    case "Citizen":
      return "CITIZEN";
    case "Customer":
      return "CUSTOMER";
  }
}

export function isSuperAdminRole(role: AppRole): boolean {
  return role === "SuperAdmin";
}

export function isAdminRole(role: AppRole): boolean {
  // Admin gates intentionally include SuperAdmin (privilege superset).
  return role === "Admin" || role === "SuperAdmin";
}

/** Admin or SuperAdmin — full write access to operational data. */
export function isStaffRole(role: AppRole): boolean {
  return role === "Admin" || role === "SuperAdmin";
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

/** Citizen portal account — same data tier as Customer (own shipments only). */
export function isCitizenRole(role: AppRole): boolean {
  return role === "Citizen";
}

/** Any "other user" / public tier: Customer or Citizen (own data only). */
export function isPublicUserRole(role: AppRole): boolean {
  return role === "Customer" || role === "Citizen";
}

export function canCreateParcels(role: AppRole): boolean {
  return can(role, "parcels.create");
}

export function canUpdateParcelStatus(role: AppRole): boolean {
  return can(role, "parcels.updateStatus");
}
