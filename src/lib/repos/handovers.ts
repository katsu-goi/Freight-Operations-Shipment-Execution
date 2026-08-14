import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Handover } from "@/types";

/** Full handover history, newest first. */
export const listHandovers = cache(
  async (limit = 100): Promise<Handover[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("handovers")
      .select("*")
      .order("handed_over_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Handover[];
  },
);

export const getHandoverById = cache(
  async (id: string): Promise<Handover | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("handovers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data as Handover) ?? null;
  },
);