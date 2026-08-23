import type { ShipmentStatus } from "@/types";

/**
 * Standardized parcel tracking workflow.
 *
 * The canonical order below drives the visual tracking timeline. Legacy hub
 * statuses (Intake → Batched → Handed Over) remain valid in the database for
 * backward compatibility and are mapped onto the same timeline.
 */
export const PARCEL_WORKFLOW: ShipmentStatus[] = [
  "Registered",
  "Pickup Scheduled",
  "Picked Up",
  "Dropped Off",
  "At Origin Hub",
  "In Transit",
  "At Destination Hub",
  "Out for Delivery",
  "Delivered",
];

/** Exception / terminal-negative statuses shown inline on the timeline. */
export const PARCEL_EXCEPTION_STATUSES: ShipmentStatus[] = [
  "Delivery Failed",
  "Returned",
  "Cancelled",
];

/** All statuses a staff user may set from the status panel. */
export const SETTABLE_STATUSES: ShipmentStatus[] = [
  ...PARCEL_WORKFLOW,
  ...PARCEL_EXCEPTION_STATUSES,
];

/** Progress percent used by the parcel progress bar. */
export function parcelProgress(status: ShipmentStatus | string): number {
  switch (status) {
    case "Registered":
      return 5;
    case "Pickup Scheduled":
      return 15;
    case "Picked Up":
      return 25;
    case "Dropped Off":
      return 30;
    case "Intake":
      return 30;
    case "At Origin Hub":
      return 40;
    case "Batched":
      return 45;
    case "Handed Over":
      return 50;
    case "In Transit":
      return 55;
    case "Returned":
      return 60;
    case "At Destination Hub":
      return 70;
    case "Out for Delivery":
      return 85;
    case "Delivered":
      return 100;
    default:
      return 0;
  }
}

/**
 * Map any stored status (including legacy freight values) onto the closest
 * step of the canonical timeline. Returns null for exception/terminal states.
 */
export function workflowIndex(status: ShipmentStatus | string): number | null {
  const normalized =
    status === "Intake"
      ? "Dropped Off"
      : status === "Batched" || status === "Handed Over"
        ? "At Origin Hub"
        : status === "Booked"
          ? "Registered"
          : status;
  const idx = PARCEL_WORKFLOW.indexOf(normalized as ShipmentStatus);
  return idx === -1 ? null : idx;
}

export function isParcelActive(status: ShipmentStatus | string): boolean {
  return !["Delivered", "Cancelled", "Archived", "Returned"].includes(status);
}

export function isExceptionStatus(status: ShipmentStatus | string): boolean {
  return PARCEL_EXCEPTION_STATUSES.includes(status as ShipmentStatus);
}

/** Human label for badges/timeline (e.g. IN TRANSIT → In Transit). */
export function statusLabel(status: string): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}
