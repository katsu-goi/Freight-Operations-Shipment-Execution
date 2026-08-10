"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  OPS_ROLES,
  STAFF_ROLES,
  requireRole,
  canApproveLoadPlans,
} from "@/lib/auth";
import { runAction, ok, fail, type ActionResult } from "@/lib/actions/result";
import { z } from "zod";
import { firstZodError } from "@/lib/validation/schemas";
import { packIntoBins, type BinSpec } from "@/lib/binpack";
import type { LoadPlanStatus } from "@/types";

// Representative Philippine LTL/FTL fleet for the packer.
const FLEET: BinSpec[] = [
  { id: "6W", label: "6-Wheeler", lengthCm: 366, widthCm: 183, heightCm: 183, maxWeightKg: 4_500 },
  { id: "10W", label: "10-Wheeler", lengthCm: 610, widthCm: 244, heightCm: 244, maxWeightKg: 10_000 },
  { id: "FT20", label: "20ft Container Truck", lengthCm: 589, widthCm: 235, heightCm: 239, maxWeightKg: 17_000 },
  { id: "FT40", label: "40ft Container Truck", lengthCm: 1_203, widthCm: 235, heightCm: 239, maxWeightKg: 26_000 },
];

function corridorKey(origin: string, destination: string) {
  return `${origin.trim().toLowerCase()}→${destination.trim().toLowerCase()}`;
}

/**
 * Deterministic first-fit-decreasing optimizer (src/lib/binpack.ts) packs
 * Booked shipments onto a representative Philippine LTL/FTL fleet. Ops
 * (incl. Planner) may create Draft plans only.
 */
export async function generateLoadPlanDraft(): Promise<ActionResult<{ planId: string }>> {
  return runAction("loadallocation.generateLoadPlanDraft", z.object({}), {}, async () => {
    const profile = await requireRole(OPS_ROLES);
    const supabase = await createClient();

    const { data: shipments, error } = await supabase
      .from("shipments")
      .select("id, reference, origin, destination, weight_kg, volume_cbm, status")
      .eq("status", "Booked")
      .order("created_at", { ascending: true });

    if (error) return fail(error.message);
    if (!shipments?.length) {
      return fail("No Booked shipments available to allocate");
    }

    const buckets = new Map<string, typeof shipments>();
    for (const s of shipments) {
      const key = corridorKey(s.origin, s.destination);
      const list = buckets.get(key) ?? [];
      list.push(s);
      buckets.set(key, list);
    }

    let best = shipments;
    let bestKey = corridorKey(shipments[0].origin, shipments[0].destination);
    for (const [key, list] of buckets) {
      if (list.length > best.length) {
        best = list;
        bestKey = key;
      }
    }

    // Deterministic first-fit-decreasing across the fleet; oversized returns unpacked.
    const { packed, unpacked } = packIntoBins(
      best.map((s) => ({
        id: s.id,
        lengthCm: 122,
        widthCm: 92,
        heightCm: 92,
        weightKg: Number(s.weight_kg) || 1,
        volumeCbm: Number(s.volume_cbm) || 0.1,
      })),
      FLEET,
    );

    const primary = packed[0];
    if (!primary || !primary.items.length) {
      return fail("Could not fit any shipment into fleet capacity");
    }

    const picked = primary.items;
    const w = primary.usedWeightKg;
    const v = primary.usedCbm;
    const binsUsed = packed.length; // additional vehicles if a corridor overflows

    const util = Math.min(
      100,
      Math.round(Math.max((w / primary.bin.maxWeightKg) * 100, (v / 60) * 100) * 100) / 100,
    );
    const score = Math.min(99, Math.round(util * 0.85 + picked.length * 2));
    const [origin, destination] = bestKey.split("→");
    const reference = `MLP-${Date.now().toString(36).toUpperCase()}`;

    const { data: plan, error: planError } = await supabase
      .from("load_plans")
      .insert({
        reference,
        status: "Draft",
        vehicle_ref: primary.bin.label,
        origin: origin,
        destination: destination,
        max_weight_kg: primary.bin.maxWeightKg,
        max_volume_cbm: 60,
        planned_weight_kg: w,
        planned_volume_cbm: v,
        utilization_pct: util,
        ml_score: score,
        ml_rationale: `First-fit-decreasing on corridor ${origin} → ${destination}: ${picked.length} shipment(s), ~${util}% utilization${
          binsUsed > 1 ? ` (${binsUsed} vehicles needed)` : ""
        }.${unpacked.length ? ` ${unpacked.length} shipment(s) did not fit any vehicle.` : ""}`,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (planError || !plan) {
      return fail(planError?.message ?? "Failed to create plan");
    }

    const items = picked.map((s, i) => ({
      plan_id: plan.id,
      shipment_id: s.id,
      sequence_no: i + 1,
    }));
    const { error: itemsError } = await supabase.from("load_plan_items").insert(items);
    if (itemsError) return fail(itemsError.message);

    revalidatePath("/load-allocation");
    return ok({ planId: plan.id });
  });
}

const approveSchema = z.object({
  planId: z.string().uuid(),
  status: z.enum(["Approved", "Rejected"]),
});

export async function setLoadPlanStatus(
  planId: string,
  status: Extract<LoadPlanStatus, "Approved" | "Rejected">,
): Promise<ActionResult> {
  return runAction(
    "loadallocation.setLoadPlanStatus",
    approveSchema,
    { planId, status },
    async ({ planId: id, status: nextStatus }) => {
      const profile = await requireRole(STAFF_ROLES);
      if (!canApproveLoadPlans(profile.role)) {
        return fail("Only Admin/Dispatcher may approve or reject");
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("load_plans")
        .update({
          status: nextStatus,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "Draft")
        .select("id")
        .maybeSingle();

      if (error) return fail(error.message);
      if (!data) return fail("Plan not found or already decided");

      revalidatePath("/load-allocation");
      return { ok: true };
    },
  );
}

export { firstZodError };