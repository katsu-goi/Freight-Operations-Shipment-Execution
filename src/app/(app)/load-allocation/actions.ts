"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  OPS_ROLES,
  STAFF_ROLES,
  requireRole,
  canApproveLoadPlans,
} from "@/lib/auth";
import type { LoadPlanStatus } from "@/types";

function corridorKey(origin: string, destination: string) {
  return `${origin.trim().toLowerCase()}→${destination.trim().toLowerCase()}`;
}

/**
 * Heuristic “ML” packer: greedy fill of Booked shipments on the busiest corridor.
 * Ops (incl. Planner) may create Draft plans only.
 */
export async function generateLoadPlanDraft(): Promise<{
  ok: boolean;
  error?: string;
  planId?: string;
}> {
  const profile = await requireRole(OPS_ROLES);
  const supabase = await createClient();

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, reference, origin, destination, weight_kg, volume_cbm, status")
    .eq("status", "Booked")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: error.message };
  if (!shipments?.length) {
    return { ok: false, error: "No Booked shipments available to allocate" };
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

  const maxWeight = 20000;
  const maxVolume = 60;
  const picked: typeof best = [];
  let w = 0;
  let v = 0;
  for (const s of best) {
    const nw = w + Number(s.weight_kg);
    const nv = v + Number(s.volume_cbm);
    if (nw <= maxWeight && nv <= maxVolume) {
      picked.push(s);
      w = nw;
      v = nv;
    }
  }

  if (!picked.length) {
    return { ok: false, error: "Could not fit any shipment into vehicle capacity" };
  }

  const util = Math.min(
    100,
    Math.round(Math.max((w / maxWeight) * 100, (v / maxVolume) * 100) * 100) / 100,
  );
  const score = Math.min(99, Math.round(util * 0.85 + picked.length * 2));
  const [origin, destination] = bestKey.split("→");
  const reference = `MLP-${Date.now().toString(36).toUpperCase()}`;

  const { data: plan, error: planError } = await supabase
    .from("load_plans")
    .insert({
      reference,
      status: "Draft",
      vehicle_ref: "TRUCK-40FT",
      origin: picked[0].origin,
      destination: picked[0].destination,
      max_weight_kg: maxWeight,
      max_volume_cbm: maxVolume,
      planned_weight_kg: w,
      planned_volume_cbm: v,
      utilization_pct: util,
      ml_score: score,
      ml_rationale: `Greedy pack on corridor ${origin} → ${destination}: ${picked.length} shipment(s), ~${util}% utilization.`,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { ok: false, error: planError?.message ?? "Failed to create plan" };
  }

  const items = picked.map((s, i) => ({
    plan_id: plan.id,
    shipment_id: s.id,
    sequence_no: i + 1,
  }));
  const { error: itemsError } = await supabase.from("load_plan_items").insert(items);
  if (itemsError) return { ok: false, error: itemsError.message };

  revalidatePath("/load-allocation");
  return { ok: true, planId: plan.id };
}

export async function setLoadPlanStatus(
  planId: string,
  status: Extract<LoadPlanStatus, "Approved" | "Rejected">,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole(STAFF_ROLES);
  if (!canApproveLoadPlans(profile.role)) {
    return { ok: false, error: "Only Admin/Dispatcher may approve or reject" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("load_plans")
    .update({
      status,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("status", "Draft")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Plan not found or already decided" };

  revalidatePath("/load-allocation");
  return { ok: true };
}
