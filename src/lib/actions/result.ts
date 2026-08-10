import { z } from "zod";
import { serverLog, errorMessage } from "@/lib/server/log";
import { firstZodError } from "@/lib/validation/schemas";

/**
 * Typed result envelope shared by every server action / route.
 * Callers should `await` a wrapped function and never throw across the
 * RPC boundary — failures are captured, logged, and returned as data.
 */
export type ActionResult<T = void> =
  | { ok: true } & (T extends void ? { value?: undefined } : { value: T })
  | { ok: false; error: string };

/** Convenience factories. */
export function ok<T>(value: T): ActionResult<T> {
  return { ok: true, value } as ActionResult<T>;
}
export function okVoid(): ActionResult {
  return { ok: true };
}
/** `never` result: shares the failure arm but never shapes the success value. */
export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/**
 * Wraps an async action body: unwraps a returned ActionResult, catches and
 * logs unexpected throws, and converts them into a fail result. Schema
 * validation is performed first via `schema.parse`.
 */
export async function runAction<TSchema extends z.ZodTypeAny, TValue>(
  action: string,
  schema: TSchema,
  input: unknown,
  body: (parsed: z.infer<TSchema>) => Promise<ActionResult<TValue> | void>,
): Promise<ActionResult<TValue>> {
  let parsed: z.infer<TSchema>;
  try {
    parsed = schema.parse(input);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: firstZodError(e) };
    }
    return { ok: false, error: errorMessage(e) };
  }

  try {
    const result = await body(parsed);
    if (result) return result as ActionResult<TValue>;
    return okVoid() as ActionResult<TValue>;
  } catch (e) {
    serverLog.error(action, { err: errorMessage(e), stack: e instanceof Error ? e.stack : undefined });
    return { ok: false, error: errorMessage(e) };
  }
}

export { firstZodError };