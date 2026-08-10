import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Database } from "@/types/database";
import { firstZodError } from "@/lib/validation/schemas";
import { serverLog } from "@/lib/server/log";

/**
 * Lightweight helpers for Route Handlers: an error envelope, auth guard,
 * body validation, and a primitive in-memory rate limiter.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(
  message: string,
  status = 500,
  code?: string,
): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

export function jsonOk<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

/** Authenticated session guard. Throws ApiError(401) when signed out. */
export async function requireUser(
  client: SupabaseClient<Database>,
): Promise<{ id: string; email: string | null }> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new ApiError(401, "Unauthorized");
  return { id: user.id, email: user.email ?? null };
}

/** z.parse an unknown request body; throws ApiError(400) on invalid input. */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(400, firstZodError(parsed.error));
  }
  return parsed.data;
}

// --- primitive in-memory sliding-window rate limiter -----------------------
// One shared bucket per process. Sufficient for a single serverless instance;
// swap for an external store (Redis/Upstash) when scaling beyond one worker.
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= maxPerMinute) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientIp(request: Request): string {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Run a handler, mapping ApiError/unknown throws to a JSON error envelope. */
export function withErrors(
  handler: () => Promise<NextResponse>,
  name = "route",
): Promise<NextResponse> {
  return handler().catch((e) => {
    if (e instanceof ApiError) {
      serverLog.warn(`api.${name}`, {
        status: e.status,
        code: e.code,
        err: e.message,
      });
      return jsonError(e.message, e.status, e.code);
    }
    serverLog.error(`api.${name}`, {
      err: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : undefined,
    });
    return jsonError(e instanceof Error ? e.message : "Internal server error", 500);
  });
}