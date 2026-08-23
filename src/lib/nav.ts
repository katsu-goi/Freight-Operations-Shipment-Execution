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
 * Admin/staff see the full operations suite; Sellers and Customers only see
 * their own scoped entries. Visibility is cosmetic — every route re-checks
 * permissions server-side (requirePermission / RLS).
 */
export const NAV_ITEMS: NavItem[] = [
  // ---- Everyone ----
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [] },
  {
    href: "/parcels",
    label: "Parcels",
    icon: Package,
    roles: ["Admin", "Dispatcher", "Planner"],
  },
  { href: "/parcels", label: "My Parcels", icon: Package, roles: ["Seller", "Customer", "Client"] },
  {
    href: "/parcels/new",
    label: "Create Parcel",
    icon: PackagePlus,
    roles: ["Admin", "Dispatcher", "Seller"],
  },
  { href: "/track", label: "Track Parcel", icon: Radar, roles: [] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: [] },

  // ---- Admin / staff only ----
  { href: "/sellers", label: "Sellers", icon: Building2, roles: ["Admin", "Dispatcher"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["Admin", "Dispatcher", "Planner"] },
  { href: "/hubs", label: "Hubs / Facilities", icon: Warehouse, roles: ["Admin", "Dispatcher"] },

  // ---- Legacy operations suite (staff) ----
  {
    href: "/pickup",
    label: "Pickup & Intake",
    icon: PackageSearch,
    roles: ["Admin", "Dispatcher", "Planner"],
  },
  {
    href: "/booking",
    label: "Shipment Bookings",
    icon: PackagePlus,
    roles: ["Admin", "Dispatcher", "Planner"],
  },
  {
    href: "/manifest",
    label: "Manifest & Consolidation",
    icon: ClipboardList,
    roles: ["Admin", "Dispatcher", "Planner"],
    badge: { text: "count", kind: "count" },
  },
  {
    href: "/handover",
    label: "Carrier Handover & History",
    icon: Handshake,
    roles: ["Admin", "Dispatcher", "Planner", "Carrier"],
  },
  {
    href: "/waybill",
    label: "Waybill Generator",
    icon: FileText,
    roles: ["Admin", "Dispatcher", "Planner"],
  },

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
