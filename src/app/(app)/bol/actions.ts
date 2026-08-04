"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { BolType } from "@/types";

export interface BolInput {
  bolNumber: string;
  bolType: BolType;
  shipmentId: string | null;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  vesselName: string;
  voyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfDelivery: string;
  containerNumber: string;
  sealNumber: string;
  totalWeightKg: number;
  totalVolumeCbm: number;
  goodsDescription: string;
  freightTerms: string;
}

export async function createBillOfLading(
  input: BolInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireRole(["Admin", "Dispatcher"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bills_of_lading")
    .insert({
      bol_number: input.bolNumber,
      bol_type: input.bolType,
      shipment_id: input.shipmentId,
      shipper_name: input.shipperName,
      consignee_name: input.consigneeName,
      notify_party: input.notifyParty,
      vessel_name: input.vesselName,
      voyage_no: input.voyageNo,
      port_of_loading: input.portOfLoading,
      port_of_discharge: input.portOfDischarge,
      place_of_delivery: input.placeOfDelivery,
      container_number: input.containerNumber,
      seal_number: input.sealNumber,
      total_weight_kg: input.totalWeightKg,
      total_volume_cbm: input.totalVolumeCbm,
      goods_description: input.goodsDescription,
      freight_terms: input.freightTerms,
      issued_date: new Date().toISOString().slice(0, 10),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/bol");
  return { ok: true, id: data.id };
}
