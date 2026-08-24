import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateParcelStatus } from "@/app/(app)/parcels/actions";
import { parcelStatusSchema } from "@/lib/validation/schemas";

/**
 * Replay endpoint for the offline outbox.
 *
 * Every queued command is re-validated (zod) and re-executed under the
 * caller's authenticated session — authorization is identical to the online
 * server actions because it literally calls them. No queued payload is ever
 * trusted without passing the same gates as a live request.
 */

const MAX_BATCH = 50;

interface SyncEntry {
  kind: string;
  payload: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  // Authentication check — session cookie only, never client-supplied role.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { entries?: SyncEntry[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return NextResponse.json({ results: [] });
  }
  if (entries.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Batch too large (max ${MAX_BATCH})` },
      { status: 413 },
    );
  }

  const results = [] as { index: number; ok: boolean; retryable: boolean; error?: string }[];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    switch (entry?.kind) {
      case "update_parcel_status": {
        const parsed = parcelStatusSchema.safeParse(entry.payload);
        if (!parsed.success) {
          results.push({
            index: i,
            ok: false,
            retryable: false,
            error: "Invalid queued status update",
          });
          break;
        }
        const result = await updateParcelStatus(parsed.data);
        results.push(
          result.ok
            ? { index: i, ok: true, retryable: false }
            : {
                index: i,
                ok: false,
                // Authorization failures are permanent; transient DB issues retry.
                retryable: !/not allowed|only /i.test(result.error),
                error: result.error,
              },
        );
        break;
      }
      default:
        results.push({
          index: i,
          ok: false,
          retryable: false,
          error: `Unknown queued command "${entry?.kind}"`,
        });
    }
  }

  return NextResponse.json({ results });
}
