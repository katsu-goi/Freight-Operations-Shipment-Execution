import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recommendRoutes, aiEnabled } from "@/lib/ai";
import type { RoutingRequest } from "@/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!aiEnabled()) {
    return NextResponse.json(
      { error: "AI provider not configured. Set GROQ_API_KEY or GEMINI_API_KEY." },
      { status: 503 },
    );
  }

  let body: RoutingRequest;
  try {
    body = (await request.json()) as RoutingRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.origin || !body.destination) {
    return NextResponse.json(
      { error: "origin and destination are required" },
      { status: 400 },
    );
  }

  try {
    const routes = await recommendRoutes(body);
    return NextResponse.json({ routes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Routing failed" },
      { status: 502 },
    );
  }
}
