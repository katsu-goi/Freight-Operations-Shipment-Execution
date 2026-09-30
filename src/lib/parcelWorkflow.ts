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

/** Operational hub statuses (booking / intake / manifest / handover steps). */
export const PARCEL_OPERATIONAL_STATUSES: ShipmentStatus[] = [
  "Booked",
  "Intake",
  "Batched",
  "Handed Over",
];

/** All statuses a staff user may set from the status panel. */
export const SETTABLE_STATUSES: ShipmentStatus[] = [
  ...PARCEL_WORKFLOW,
  ...PARCEL_OPERATIONAL_STATUSES,
  ...PARCEL_EXCEPTION_STATUSES,
];

/** Progress percent used by the parcel progress bar. */
export function parcelProgress(status: ShipmentStatus | string): number {
  switch (status) {
    case "Registered":
      return 5;
    case "Booked":
      return 8;
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

// ---------------------------------------------------------------------------
// Admin processing workflow (mirrors supabase migration 20260929).
// Canonical chain:
//   REGISTERED → RECEIVED → BOOKED → MANIFESTED → HANDED OVER
//   → IN TRANSIT → DELIVERED
// Received  = Pickup Scheduled / Picked Up / Dropped Off / Intake /
//             At Origin Hub.  Manifested = Batched.
// ---------------------------------------------------------------------------

/** Parcel intake channel chosen by the seller at registration. */
export type DeliveryMethod = "Pickup" | "Drop-off";
export const DELIVERY_METHODS: DeliveryMethod[] = ["Pickup", "Drop-off"];

/** Statuses that count as the RECEIVED step. */
export const RECEIVED_STATUSES: ShipmentStatus[] = [
  "Pickup Scheduled",
  "Picked Up",
  "Dropped Off",
  "Intake",
  "At Origin Hub",
];

/** Statuses that count as the MANIFESTED step. */
export const MANIFESTED_STATUSES: ShipmentStatus[] = ["Batched"];

/** Late-stage transit statuses (only reachable after handover). */
export const TRANSIT_STATUSES: ShipmentStatus[] = [
  "Handed Over",
  "In Transit",
  "At Destination Hub",
  "Out for Delivery",
  "Delivered",
];

/** Exact seller-facing handover notification text. */
export function handoverMessage(trackingNumber: string, location?: string | null): string {
  return (
    `Your parcel ${trackingNumber} has been successfully handed over ` +
    `to our delivery partner.` +
    (location ? ` Current location: ${location}.` : "")
  );
}

function isTerminal(status: string): boolean {
  return status === "Delivered" || status === "Cancelled";
}

/**
 * Client-side mirror of the database workflow guard. Returns null when the
 * transition is allowed, otherwise a human-readable reason. The database RPC
 * re-checks the same rules — this helper only drives the UI (allowed next
 * statuses, early error messages).
 */
export function transitionError(from: string, to: string): string | null {
  if (from === to) return "Parcel already has this status";
  if (isTerminal(from)) {
    return `${from} parcels are final and cannot be changed`;
  }
  if (to === "Batched" && from === "Registered") {
    return "Parcel must be received (pickup / drop-off) or booked before it can be manifested";
  }
  if (to === "Handed Over" && from === "Registered") {
    return "Parcel must be received, booked and manifested before handover";
  }
  if (
    ["In Transit", "At Destination Hub", "Out for Delivery", "Delivered"].includes(to) &&
    !["Handed Over", "In Transit", "At Destination Hub", "Out for Delivery", "Delivered"].includes(from)
  ) {
    return "Parcel must be handed over to the delivery partner before it can move into transit";
  }
  if (
    to === "Delivered" &&
    !["Handed Over", "In Transit", "At Destination Hub", "Out for Delivery"].includes(from)
  ) {
    return "Parcel can only be delivered after handover into the delivery network";
  }
  if (
    ["Registered", "Booked", "Pickup Scheduled", "Picked Up", "Dropped Off", "Intake", "At Origin Hub", "Batched", "Handed Over"].includes(to) &&
    ["In Transit", "At Destination Hub", "Out for Delivery", "Delivered"].includes(from)
  ) {
    return `Parcel has already left the hub and cannot be moved back to ${to}`;
  }
  return null;
}

export function isAllowedTransition(from: string, to: string): boolean {
  return transitionError(from, to) === null;
}

/** Next statuses an admin may pick from the current status (UI helper). */
export function allowedNextStatuses(current: string): ShipmentStatus[] {
  return SETTABLE_STATUSES.filter((s) => isAllowedTransition(current, s));
}
