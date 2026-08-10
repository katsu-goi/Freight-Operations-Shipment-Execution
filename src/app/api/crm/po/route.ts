import { createAdminClient } from "@/lib/supabase/admin";
import { withErrors, rateLimit, clientIp, jsonOk, ApiError } from "@/lib/server/api";
import { ingestCrmPoSchema } from "@/lib/validation/schemas";

/**
 * CRM purchase-order webhook. Idempotent via the ledger's
 * (source, idempotency_key) unique constraint. Requires a bearer token
 * (CRM_WEBHOOK_SECRET) — NOT the in-app auth session.
 */
export async function POST(request: Request) {
  return withErrors(async () => {
    const secret = process.env.CRM_WEBHOOK_SECRET;
    if (!secret) {
      throw new ApiError(503, "CRM_WEBHOOK_SECRET is not configured");
    }
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token || token !== secret) {
      throw new ApiError(401, "Invalid webhook token");
    }
    if (!rateLimit(`crm:po:${clientIp(request)}`, 60)) {
      throw new ApiError(429, "Rate limit exceeded; try again shortly");
    }

    const body = await request
      .json()
      .catch(() => {
        throw new ApiError(400, "Invalid JSON body");
      });
    let input;
    try {
      input = ingestCrmPoSchema.parse(body);
    } catch (err) {
      throw new ApiError(
        400,
        err instanceof Error ? err.message : "Invalid payload",
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("ingest_crm_po", {
      p_idempotency_key: input.idempotencyKey,
      p_po_number: input.poNumber,
      p_client_name: input.clientName,
      p_vendor: input.vendor,
      p_currency: input.currency,
      p_total_amount: input.totalAmount ?? 0,
      p_client_email: input.clientEmail,
      p_items: input.items.map((i) => ({
        sku: i.sku,
        name: i.name,
        qty_ordered: i.qtyOrdered ?? 0,
        unit_price: i.unitPrice ?? 0,
      })),
      p_notes: input.notes,
    });

    if (error) {
      throw new ApiError(502, error.message, "crm_ingest_failed");
    }
    return jsonOk(data);
  }, "crm/po");
}