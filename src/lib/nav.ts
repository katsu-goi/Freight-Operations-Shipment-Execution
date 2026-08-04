import type { AppRole } from "@/types";
import {
  BarChart3,
  Plus,
  Boxes,
  FileText,
  Navigation,
  Layers,
  Database,
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

/** Ordered navigation for the fixed dark sidebar. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard Overview",
    icon: BarChart3,
    roles: [],
  },
  {
    href: "/booking",
    label: "Booking & AI Routing",
    icon: Plus,
    roles: ["Admin", "Dispatcher"],
    badge: { text: "AI", kind: "ai" },
  },
  {
    href: "/consolidation",
    label: "LCL / FCL Consolidation",
    icon: Boxes,
    roles: ["Admin", "Dispatcher"],
    badge: { text: "count", kind: "count" },
  },
  {
    href: "/bol",
    label: "House & Master BoL",
    icon: FileText,
    roles: ["Admin", "Dispatcher"],
  },
  {
    href: "/tracking",
    label: "Live Shipment Tracking",
    icon: Navigation,
    roles: [],
    badge: { text: "LIVE", kind: "live" },
  },
  {
    href: "/purchase-orders",
    label: "PO Integration & SLA",
    icon: Layers,
    roles: ["Admin", "Dispatcher", "Client"],
  },
  {
    href: "/schema",
    label: "Supabase DDL Schema",
    icon: Database,
    roles: ["Admin"],
  },
];

export function visibleNav(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.includes(role),
  );
}
