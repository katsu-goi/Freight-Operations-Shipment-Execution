import { createClient } from "@/lib/supabase/server";
import { parseBillOfLading, aiEnabled } from "@/lib/ai";
import { getActiveExamples, buildFewShotPrefix } from "@/lib/ai-training";
import {
  requireUser,
  validate,
  withErrors,
  rateLimit,
  clientIp,
  jsonOk,
  ApiError,
} from "@/lib/server/api";
import { bolParseSchema } from "@/lib/validation/schemas";

const RATE_LIMIT = { perMinute: 20 };

export async function POST(request: Request) {
  return withErrors(async () => {
    const supabase = await createClient();
    await requireUser(supabase);

    if (!aiEnabled()) {
      throw new ApiError(
        503,
        "AI provider not configured. Set GROQ_API_KEY or GEMINI_API_KEY.",
      );
    }
    if (!rateLimit(`ai:parse:${clientIp(request)}`, RATE_LIMIT.perMinute)) {
      throw new ApiError(429, "Rate limit exceeded; try again shortly");
    }

    const body = await request
      .json()
      .catch(() => {
        throw new ApiError(400, "Invalid JSON body");
      });
    const input = validate(bolParseSchema, body);

    try {
      const examples = await getActiveExamples("bol_parse");
      const parsed = await parseBillOfLading(input.text, buildFewShotPrefix(examples));
      return jsonOk({ parsed });
    } catch (e) {
      throw new ApiError(502, e instanceof Error ? e.message : "Parsing failed");
    }
  }, "parse-bl");
}