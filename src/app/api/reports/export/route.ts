import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, withErrors, jsonOk, ApiError } from "@/lib/server/api";
import { reportFilterSchema } from "@/lib/validation/schemas";
import { applyReportFilters, toCsv, toPrintableHtml } from "@/lib/reports";
import type { Shipment } from "@/types";

/**
 * GET /api/reports/export?from=YYYY-MM-DD&to=...&status=...&platform=...&search=...&format=csv|pdf
 * Admin / SuperAdmin only (RLS + explicit role check). CSV downloads as a
 * file; PDF returns printable HTML (browser Print → Save as PDF).
 */
export async function GET(request: Request) {
  return withErrors(async () => {
    const supabase = await createClient();
    const sessionUser = await requireUser(supabase);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionUser.id)
      .maybeSingle();
    if (profile?.role !== "Admin" && profile?.role !== "SuperAdmin") {
      throw new ApiError(403, "Reports are restricted to administrators");
    }

    const url = new URL(request.url);
    const input = reportFilterSchema.parse({
      from: url.searchParams.get("from") ?? "",
      to: url.searchParams.get("to") ?? "",
      status: url.searchParams.get("status") ?? "",
      platform: url.searchParams.get("platform") ?? "",
      search: url.searchParams.get("search") ?? "",
      format: url.searchParams.get("format") ?? "csv",
    });

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new ApiError(500, error.message);

    const rows = applyReportFilters((data ?? []) as Shipment[], input);
    const stamp = new Date().toISOString().slice(0, 10);

    if (input.format === "pdf") {
      const html = toPrintableHtml(rows, input, new Date().toISOString());
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="report-${stamp}.html"`,
        },
      });
    }

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${stamp}.csv"`,
      },
    });
  }, "reports-export");

  // Keep TS happy about unused import in some build configs.
  void jsonOk;
}
