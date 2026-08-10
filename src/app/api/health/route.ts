import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe for uptime monitors / platforms.
 * Uses the service-role client (bypasses RLS). Returns 200 with service
 * checks; degrades to 503 when Supabase is unreachable.
 */
export async function GET() {
  const checks: Record<string, "ok" | "error"> = { app: "ok" };
  let healthy = true;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("shipments").select("id").limit(1);
    checks.supabase = error ? "error" : "ok";
    if (error) healthy = false;
  } catch {
    checks.supabase = "error";
    healthy = false;
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}