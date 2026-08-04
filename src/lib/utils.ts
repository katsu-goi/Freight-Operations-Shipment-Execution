import type { ShipmentStatus, TransportMode } from "@/types";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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
      return "bg-blue-100 text-blue-700";
    case "Customs Hold":
      return "bg-amber-100 text-amber-800";
    case "Delivered":
      return "bg-emerald-100 text-emerald-700";
    case "Delayed":
      return "bg-rose-100 text-rose-700";
    case "Cancelled":
      return "bg-slate-200 text-slate-500";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export const TRANSPORT_MODES: TransportMode[] = ["Ocean", "Air", "Road", "Rail"];

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "Booked",
  "In Transit",
  "Customs Hold",
  "Delivered",
  "Delayed",
  "Cancelled",
];
