"use client";

/**
 * Offline action outbox (IndexedDB).
 *
 * When the app is offline, mutations are appended here instead of being sent.
 * On reconnect — via `window.online`, a Background Sync event, or the next
 * load — every entry is replayed to POST /api/sync which re-validates and
 * executes it under the user's session. Entries that permanently fail
 * (validation/authorization) are dropped; transient failures stay queued.
 */

const DB_NAME = "airship-outbox";
const STORE = "actions";
const MAX_ENTRIES = 100;

export interface OutboxEntry {
  id?: number;
  /** Command discriminator handled by /api/sync. */
  kind: "update_parcel_status";
  payload: Record<string, unknown>;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineAction(
  kind: OutboxEntry["kind"],
  payload: Record<string, unknown>,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      kind,
      payload,
      createdAt: Date.now(),
    } satisfies Omit<OutboxEntry, "id">);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  // Ask the browser to wake us when connectivity returns (even if the tab
  // was closed). Silently ignored on unsupported browsers.
  try {
    const reg = await navigator.serviceWorker?.ready;
    await (reg as any)?.sync?.register("outbox-sync");
  } catch {
    /* Background Sync unsupported — online-listener fallback covers us */
  }
}

export async function getOutboxEntries(): Promise<OutboxEntry[]> {
  const db = await openDb();
  const entries = await new Promise<OutboxEntry[]>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OutboxEntry[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return entries.slice(-MAX_ENTRIES);
}

async function deleteEntry(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

let flushing = false;

/**
 * Replays queued actions against /api/sync. Safe to call repeatedly —
 * concurrent calls are collapsed, succeeded entries are removed, entries
 * that fail with a permanent error are dropped, transient failures retry on
 * the next flush.
 */
export async function flushOutbox(): Promise<{ synced: number; failed: number }> {
  if (flushing) return { synced: 0, failed: 0 };
  flushing = true;
  try {
    const entries = await getOutboxEntries();
    if (entries.length === 0) return { synced: 0, failed: 0 };

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok && res.status !== 200) {
      // Network/server-level failure → keep everything for the next attempt.
      return { synced: 0, failed: entries.length };
    }

    const body = (await res.json()) as {
      results: { index: number; ok: boolean; retryable?: boolean }[];
    };

    let synced = 0;
    let failed = 0;
    for (const result of body.results) {
      const entry = entries[result.index];
      if (!entry) continue;
      if (result.ok) {
        await deleteEntry(entry.id!);
        synced += 1;
      } else if (!result.retryable) {
        // Permanent rejection (validation/authz) — drop to avoid poison queue.
        await deleteEntry(entry.id!);
        failed += 1;
      }
    }
    return { synced, failed };
  } finally {
    flushing = false;
  }
}