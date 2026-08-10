import { z } from "zod";
import { TRANSPORT_MODES, SHIPMENT_STATUSES } from "@/lib/utils";

/**
 * Canonical zod schemas for every server mutation. Mirrors the client form
 * field names exactly; server actions validate with these before touching
 * the database. Reuse in client components for `useForm` compat if desired.
 */

const positiveNumber = (message: string) =>
  z.number({ message }).nonnegative({ message });

/** Booking form (src/app/(app)/booking). */
export const bookingSchema = z.object({
  clientName: z.string().trim().min(2, "Client name is required").max(200),
  shipper: z.string().trim().min(2, "Shipper is required").max(200),
  consignee: z.string().trim().min(2, "Consignee is required").max(200),
  origin: z.string().trim().min(2, "Origin is required").max(200),
  destination: z.string().trim().min(2, "Destination is required").max(200),
  mode: z.enum(TRANSPORT_MODES),
  cargoType: z.string().trim().min(1, "Cargo type is required").max(200),
  incoterms: z.string().trim().max(40).default("FOB"),
  weightKg: positiveNumber("Weight must be >= 0"),
  volumeCbm: positiveNumber("Volume must be >= 0"),
  hazardClass: z.string().trim().max(40).default("None"),
  poNumber: z.string().trim().max(80).optional().default(""),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const routingRequestSchema = z.object({
  origin: z.string().trim().min(2).max(200),
  destination: z.string().trim().min(2).max(200),
  mode: z.enum(TRANSPORT_MODES),
  weightKg: positiveNumber("Weight must be >= 0"),
  volumeCbm: positiveNumber("Volume must be >= 0"),
  incoterms: z.string().trim().max(40).default("FOB"),
});
export type RoutingRequestInput = z.infer<typeof routingRequestSchema>;

/** Bill of Lading creation (src/app/(app)/bol). */
export const bolSchema = z.object({
  bolNumber: z.string().trim().min(4, "BoL number is required").max(40),
  bolType: z.enum(["HBL", "MBL"]),
  shipmentId: z.string().uuid().nullable().optional(),
  shipperName: z.string().trim().max(200).default(""),
  consigneeName: z.string().trim().max(200).default(""),
  notifyParty: z.string().trim().max(200).optional().default(""),
  vesselName: z.string().trim().max(200).optional().default(""),
  voyageNo: z.string().trim().max(60).optional().default(""),
  portOfLoading: z.string().trim().max(200).optional().default(""),
  portOfDischarge: z.string().trim().max(200).optional().default(""),
  placeOfDelivery: z.string().trim().max(200).optional().default(""),
  containerNumber: z.string().trim().max(40).optional().default(""),
  sealNumber: z.string().trim().max(40).optional().default(""),
  totalWeightKg: positiveNumber("Weight must be >= 0").default(0),
  totalVolumeCbm: positiveNumber("Volume must be >= 0").default(0),
  goodsDescription: z.string().trim().max(2000).default(""),
  freightTerms: z.string().trim().max(40).default("Prepaid"),
});
export type BolInput = z.infer<typeof bolSchema>;

export const bolParseSchema = z.object({
  text: z.string().trim().min(10, "Paste enough BoL text to parse").max(20_000),
});

/** Tracking update (src/app/(app)/tracking). */
export const trackingUpdateSchema = z.object({
  shipmentId: z.string().uuid(),
  message: z.string().trim().max(500).default(""),
  location: z.string().trim().max(200).default(""),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  progress: z.number().int().min(0).max(100).nullable().optional(),
  status: z.enum(SHIPMENT_STATUSES).nullable().optional(),
});
export type TrackingUpdateInput = z.infer<typeof trackingUpdateSchema>;

/** Container creation (src/app/(app)/consolidation). */
export const containerSchema = z.object({
  reference: z.string().trim().min(4).max(40),
  containerType: z.string().trim().min(3).max(60),
  loadType: z.enum(["LCL", "FCL"]),
  maxVolumeCbm: positiveNumber("Max volume must be > 0"),
  maxWeightKg: positiveNumber("Max weight must be > 0"),
  origin: z.string().trim().min(2).max(200).default(""),
  destination: z.string().trim().min(2).max(200).default(""),
  vessel: z.string().trim().max(200).optional().default(""),
});
export type ContainerInput = z.infer<typeof containerSchema>;

export const containerAssignSchema = z.object({
  containerId: z.string().uuid(),
  shipmentId: z.string().uuid(),
});

/** CRM purchase-order webhook payload (src/app/api/crm/po). */
export const ingestCrmPoSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  poNumber: z.string().trim().min(1, "poNumber is required").max(80),
  clientName: z.string().trim().min(1, "clientName is required").max(200),
  vendor: z.string().trim().max(200).optional().default(""),
  currency: z.string().trim().max(10).optional().default("PHP"),
  totalAmount: z.number().nonnegative().optional(),
  clientEmail: z.string().trim().email("clientEmail must be a valid email").max(200).optional().default(""),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(80),
        name: z.string().trim().max(300).optional().default(""),
        qtyOrdered: z.number().int().nonnegative().optional(),
        unitPrice: z.number().nonnegative().optional(),
      }),
    )
    .max(200)
    .default([]),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type IngestCrmPoInput = z.infer<typeof ingestCrmPoSchema>;

/** Report validation errors as a single human-readable string. */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}