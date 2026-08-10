import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BillOfLading } from "@/types";

export const listBillsOfLading = cache(async (): Promise<BillOfLading[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bills_of_lading")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const getBillOfLadingById = cache(
  async (id: string): Promise<BillOfLading | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bills_of_lading")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as BillOfLading) ?? null;
  },
);