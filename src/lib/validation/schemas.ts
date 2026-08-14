import { z } from "zod";
import { DELIVERY_PLATFORMS, PICKUP_STATUSES } from "@/lib/utils";

/**
 * Canonical zod schemas for every server mutation. Mirrors the client form
 * field names exactly; server actions validate with these before touching
 * the database.
 */

const positiveNumber = (message: string) =>
  z.number({ message }).nonnegative({ message });

/** New parcel booking (src/app/(app)/booking). */
export const bookingSchema = z.object({
  clientName: z.string().trim().min(2, "Seller / client name is required").max(200),
  consignee: z.string().trim().min(2, "Recipient name is required").max(200),
  platform: z.enum(DELIVERY_PLATFORMS, {
    message: "Delivery platform is required",
  }),
  origin: z.string().trim().min(1, "Branch Hub is the pickup origin").max(200),
  destination: z.string().trim().min(2, "Destination area is required").max(200),
  weightKg: positiveNumber("Weight must be >= 0"),
  codAmount: positiveNumber("COD amount must be >= 0"),
  serviceType: z.string().trim().max(40).default("Standard"),
  trackingNumber: z.string().trim().max(80).optional().default(""),
});
export type BookingInput = z.infer<typeof bookingSchema>;

/** Seller registration (src/app/(app)/pickup). */
export const sellerSchema = z.object({
  name: z.string().trim().min(2, "Seller name is required").max(200),
  contactPerson: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  address: z.string().trim().max(300).optional().default(""),
  pickupFrequency: z.string().trim().max(40).optional().default("On-demand"),
});
export type SellerInput = z.infer<typeof sellerSchema>;

/** Schedule a pickup for a seller (src/app/(app)/pickup). */
export const pickupSchema = z.object({
  sellerId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  parcelCount: positiveNumber("Parcel count must be >= 0"),
  notes: z.string().trim().max(500).optional().default(""),
});
export type PickupInput = z.infer<typeof pickupSchema>;

/** Bulk intake: ingest one parcel at a time from a scanning counter. */
export const parcelIntakeSchema = z.object({
  sellerId: z.string().uuid().nullable().optional(),
  reference: z.string().trim().min(2, "Parcel reference is required").max(80),
  trackingNumber: z.string().trim().max(80).optional().default(""),
  consignee: z.string().trim().max(200).optional().default(""),
  destination: z.string().trim().max(200).optional().default("Metro Manila"),
  platform: z.enum(DELIVERY_PLATFORMS),
  weightKg: positiveNumber("Weight must be >= 0"),
  codAmount: positiveNumber("COD amount must be >= 0"),
});
export type ParcelIntakeInput = z.infer<typeof parcelIntakeSchema>;

/** Create a courier batch and assign parcels (src/app/(app)/manifest). */
export const batchCreateSchema = z.object({
  platform: z.enum(DELIVERY_PLATFORMS),
  parcelIds: z.array(z.string().uuid()).min(1, "Select at least one parcel"),
});
export type BatchCreateInput = z.infer<typeof batchCreateSchema>;

/** Mark a batch Ready for pickup (after manifest is generated). */
export const batchReadySchema = z.object({
  batchId: z.string().uuid(),
});

/** Finalize handover to the third-party rider (src/app/(app)/handover). */
export const handoverSchema = z.object({
  batchId: z.string().uuid(),
  riderName: z.string().trim().min(2, "Rider name is required").max(200),
  riderPhone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});
export type HandoverInput = z.infer<typeof handoverSchema>;

/** Cancel a booking with a reason. */
export const cancelBookingSchema = z.object({
  shipmentId: z.string().uuid(),
  cancelReason: z.string().trim().min(2, "Cancellation reason is required").max(500),
});

/** Lifecycle action on a pickup request. */
export const pickupStatusSchema = z.object({
  pickupId: z.string().uuid(),
  status: z.enum(PICKUP_STATUSES),
});

/** AI routing request (legacy multimodal engine, kept for the API). */
export const routingRequestSchema = z.object({
  origin: z.string().trim().min(2).max(200),
  destination: z.string().trim().min(2).max(200),
  mode: z.enum(["Ocean", "Air", "Road", "Rail"]),
  weightKg: positiveNumber("Weight must be >= 0"),
  volumeCbm: positiveNumber("Volume must be >= 0"),
  incoterms: z.string().trim().max(40).default("FOB"),
});
export type RoutingRequestInput = z.infer<typeof routingRequestSchema>;

/** CRM purchase-order webhook payload (idempotent ingest via RPC). */
export const ingestCrmPoSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  poNumber: z.string().min(1).max(80),
  clientName: z.string().min(1).max(200),
  vendor: z.string().max(200).optional().default(""),
  currency: z.string().max(10).default("PHP"),
  totalAmount: z.number().nonnegative().optional(),
  clientEmail: z.string().email(),
  items: z
    .array(
      z.object({
        sku: z.string().min(1).max(80),
        name: z.string().min(1).max(200),
        qtyOrdered: z.number().int().nonnegative().optional(),
        unitPrice: z.number().nonnegative().optional(),
      }),
    )
    .default([]),
  notes: z.string().max(500).optional().default(""),
});

/** House Bill / Receipt (src/app/(app)/waybill). */
export const bolSchema = z.object({
  bolNumber: z.string().trim().min(4, "Waybill number is required").max(40),
  bolType: z.enum(["HBL", "MBL"]),
  shipmentId: z.string().uuid().nullable().optional(),
  shipperName: z.string().trim().max(200).default(""),
  consigneeName: z.string().trim().max(200).default(""),
  notifyParty: z.string().trim().max(200).optional().default(""),
  containerNumber: z.string().trim().max(40).optional().default(""),
  sealNumber: z.string().trim().max(40).optional().default(""),
  totalWeightKg: positiveNumber("Weight must be >= 0").default(0),
  totalVolumeCbm: positiveNumber("Volume must be >= 0").default(0),
  goodsDescription: z.string().trim().max(2000).default(""),
  freightTerms: z.string().trim().max(40).default("Prepaid"),
});
export type BolInput = z.infer<typeof bolSchema>;

export const bolParseSchema = z.object({
  text: z.string().trim().min(10, "Paste enough document text to parse").max(20_000),
});

/** Validation error helper. */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}