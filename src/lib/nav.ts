import type { AppRole } from "@/types";
import {
  LayoutDashboard,
  PackageSearch,
  PackagePlus,
  ClipboardList,
  Handshake,
  FileText,
  Users,
  Building2,
  Package,
  Warehouse,
  Radar,
  Bell,
  ScrollText,
  Settings,
  UserCircle,
  Truck,
  Network,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Empty = everyone authenticated. */
  roles: AppRole[];
  badge?: { text: string; kind: "ai" | "live" | "count" };
}

/**
 * Role-specific navigation.
 * Admin sees the full operations suite; Sellers and Customers only see their
 * own scoped entries. Visibility is cosmetic — every route re-checks
 * permissions server-side (requirePermission / RLS).
 */
export const NAV_ITEMS: NavItem[] = [
  // ---- Everyone ----
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [] },
  { href: "/parcels", label: "Parcels", icon: Package, roles: ["Admin"] },
  {
    href: "/parcels",
    label: "My Parcels",
    icon: Package,
    roles: ["Seller", "Customer"],
  },
  {
    href: "/parcels/new",
    label: "Create Parcel",
    icon: PackagePlus,
    roles: ["Admin", "Seller"],
  },
  { href: "/track", label: "Track Parcel", icon: Radar, roles: [] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: [] },

  // ---- Admin only ----
  { href: "/sellers", label: "Sellers", icon: Building2, roles: ["Admin"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["Admin"] },
  { href: "/hubs", label: "Hubs / Facilities", icon: Warehouse, roles: ["Admin"] },

  // ---- Legacy operations suite (admin) ----
  { href: "/pickup", label: "Pickup & Intake", icon: PackageSearch, roles: ["Admin"] },
  { href: "/booking", label: "Shipment Bookings", icon: PackagePlus, roles: ["Admin"] },
  {
    href: "/manifest",
    label: "Manifest & Consolidation",
    icon: ClipboardList,
    roles: ["Admin"],
    badge: { text: "count", kind: "count" },
  },
  {
    href: "/handover",
    label: "Carrier Handover & History",
    icon: Handshake,
    roles: ["Admin"],
  },
  { href: "/waybill", label: "Waybill Generator", icon: FileText, roles: ["Admin"] },

  // ---- Admin only ----
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["Admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["Admin"] },

  // ---- Everyone ----
  { href: "/profile", label: "Profile", icon: UserCircle, roles: [] },
];

export function visibleNav(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.includes(role),
  );
}

/**
 * Entries grouped into the header Settings dropdown instead of the sidebar.
 * Rendered by <SettingsMenu /> (role-filtered) and hidden from the sidebar.
 */
export const SETTINGS_MENU_HREFS = ["/audit-logs", "/settings", "/profile"];

// ---------------------------------------------------------------------------
// Grouped admin navigation — collapsible dropdown sections for the sidebar.
// ---------------------------------------------------------------------------

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
  hrefs: string[];
  /** Short description shown as subtitle in the group header tooltip. */
  description?: string;
}

/**
 * Admin sidebar groups. Order matters — rendered in this sequence.
 * - Operations Hub: sequential shipment execution pipeline (intake → handover)
 * - Partner Network: master data / directory (sellers, customers, facilities)
 *
 * Groups are role-filtered the same as individual items; non-Admin roles
 * automatically hide both groups (no matching hrefs visible).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "operations",
    label: "Operations Hub",
    icon: Truck,
    roles: ["Admin"],
    hrefs: ["/pickup", "/booking", "/manifest", "/handover", "/waybill"],
    description: "Pickup → Booking → Manifest → Handover → Waybill",
  },
  {
    id: "directory",
    label: "Partner Network",
    icon: Network,
    roles: ["Admin"],
    hrefs: ["/sellers", "/customers", "/hubs"],
    description: "Sellers, customers & facilities",
  },
];

/** Hrefs that belong to any NavGroup (used to hide them from the flat list). */
export const GROUPED_HREFS: string[] = NAV_GROUPS.flatMap((g) => g.hrefs);
