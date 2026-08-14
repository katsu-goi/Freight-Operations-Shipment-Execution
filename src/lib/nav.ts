import type { AppRole } from "@/types";
import {
  LayoutDashboard,
  PackageSearch,
  PackagePlus,
  ClipboardList,
  Handshake,
  FileText,
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

/** Ordered navigation for the fixed dark sidebar. Local e-commerce hub scope. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Operations Dashboard",
    icon: LayoutDashboard,
    roles: [],
  },
  {
    href: "/pickup",
    label: "Seller Pickup & Intake",
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
    label: "Waybill & Document Generator",
    icon: FileText,
    roles: ["Admin", "Dispatcher", "Planner"],
  },
];

export function visibleNav(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.includes(role),
  );
}