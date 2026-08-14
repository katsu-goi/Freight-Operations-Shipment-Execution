import type {
  ShipmentStatus,
  TransportMode,
  DeliveryPlatform,
  BatchStatus,
  PickupStatus,
} from "@/types";
import { DEFAULT_CURRENCY } from "@/lib/locale";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format money; defaults to Philippine pesos (₱). Treats legacy USD as PHP. */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const code = !currency || currency.toUpperCase() === "USD" ? DEFAULT_CURRENCY : currency;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Tailwind classes for a status badge. */
export function statusBadgeClass(status: ShipmentStatus | string): string {
  switch (status) {
    case "In Transit":
    case "Intake":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case "Batched":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "Customs Hold":
    case "Draft":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "Delivered":
    case "Approved":
    case "Handed Over":
    case "Received":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "Delayed":
    case "Rejected":
    case "No Show":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
    case "Cancelled":
      return "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export const TRANSPORT_MODES: TransportMode[] = ["Ocean", "Air", "Road", "Rail"];

/** Supported partner courier / e-commerce platforms. */
export const DELIVERY_PLATFORMS: DeliveryPlatform[] = [
  "J&T Express",
  "Flash Express",
  "LBC Express",
  "GoGo Xpress",
  "Shopee Drop-Off",
  "Lazada Drop-Off",
  "TikTok Shop Drop-Off",
  "Custom Partner",
];

/** Parcel lifecycle at the hub (terminal on carrier handover). */
export const PARCEL_STATUSES: ShipmentStatus[] = [
  "Intake",
  "Batched",
  "Handed Over",
  "Cancelled",
  "Archived",
];

export const BATCH_STATUSES: BatchStatus[] = ["Draft", "Ready", "Handed Over"];

export const PICKUP_STATUSES: PickupStatus[] = [
  "Scheduled",
  "In Transit",
  "Received",
  "No Show",
  "Cancelled",
];
