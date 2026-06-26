/**
 * offlineQueue.ts — IndexedDB-backed offline form queue for FLUID-05
 *
 * When the user submits a fluid entry while offline, the entry is stored
 * in IndexedDB. When the connection returns (window "online" event), the
 * queue is flushed by POSTing each entry to /api/fluid.
 *
 * Uses the `idb` library (Jake Archibald / Google Chrome team) — a typed,
 * promise-based wrapper around the raw IndexedDB API.
 *
 * Toast IDs mirror the UI-SPEC copy:
 *  - Offline: "Catatan disimpan dan akan disinkronkan saat kembali online"
 *  - Sync success: "Catatan berhasil disinkronkan"
 */
"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { CreateFluidFormData } from "./validators/fluid.schema";

// ─── IndexedDB setup ─────────────────────────────────────────────────────────

const DB_NAME = "kidneybuddy-offline";
const DB_VERSION = 1;
const STORE_NAME = "fluidQueue";

export type QueuedFluidEntry = CreateFluidFormData & {
  _queuedAt: string; // ISO timestamp
  _id: string; // local random ID
};

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "_id" });
      }
    },
  });
}

// ─── Queue operations ─────────────────────────────────────────────────────────

/**
 * Add a fluid entry to the offline queue.
 * Called when the POST request fails due to offline state.
 */
export async function enqueue(entry: CreateFluidFormData): Promise<void> {
  const db = await getDb();
  const queued: QueuedFluidEntry = {
    ...entry,
    _queuedAt: new Date().toISOString(),
    _id: `fluid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  await db.add(STORE_NAME, queued);
}

/**
 * Get all queued entries (for display/sync).
 */
export async function getQueue(): Promise<QueuedFluidEntry[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

/**
 * Remove a specific entry from the queue by its local ID.
 */
async function dequeue(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

// ─── Flush (sync when online) ────────────────────────────────────────────────

let _accessToken: string | null = null;
let _isFlushing = false;

/**
 * Set the current access token for flush requests.
 * Call this whenever the auth token changes.
 */
export function setAccessTokenForQueue(token: string | null): void {
  _accessToken = token;
}

/**
 * Flush all queued entries to the server.
 * Called automatically on window "online" event and on app startup.
 */
export async function flush(
  onSync?: (count: number) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  if (_isFlushing) return;
  if (!_accessToken) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  _isFlushing = true;
  let syncedCount = 0;

  try {
    for (const entry of queue) {
      try {
        // Remove internal queue fields before sending
        const { _queuedAt: _q, _id, ...payload } = entry;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/fluid`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${_accessToken}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (res.ok || res.status === 409) {
          // 409 = already exists (idempotent) — still remove from queue
          await dequeue(_id);
          syncedCount++;
        }
      } catch {
        // Network still down for this entry — leave in queue, try next time
      }
    }
  } finally {
    _isFlushing = false;
  }

  if (syncedCount > 0) {
    onSync?.(syncedCount);
  } else if (queue.length > 0) {
    onError?.(new Error(`${queue.length} entri masih menunggu sinkronisasi`));
  }
}

// ─── Register online event listener ─────────────────────────────────────────

let _onlineListenerRegistered = false;

/**
 * Register the window "online" event listener to flush on reconnection.
 * Safe to call multiple times — only registers once.
 */
export function registerOnlineListener(
  onSync?: (count: number) => void,
  onError?: (err: Error) => void,
): void {
  if (typeof window === "undefined") return;
  if (_onlineListenerRegistered) return;
  _onlineListenerRegistered = true;

  window.addEventListener("online", () => {
    flush(onSync, onError).catch(console.error);
  });
}

/**
 * Check the current queue size (for pending indicator in UI).
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
