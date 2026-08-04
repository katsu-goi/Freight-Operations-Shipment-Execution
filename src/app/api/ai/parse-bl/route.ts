import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBillOfLading, aiEnabled } from "@/lib/ai";

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

  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = body.text ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const parsed = await parseBillOfLading(text);
    return NextResponse.json({ parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parsing failed" },
      { status: 502 },
    );
  }
}
