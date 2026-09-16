import * as SQLite from "expo-sqlite";

export type ScanType = "entry" | "exit";
export type SyncStatus = "pending" | "syncing" | "failed";
export type QueuedScan = { id: number; qr_token: string; scan_type: ScanType; event_id: string; scanned_at: string; sync_status: SyncStatus; retry_count: number };

const MAX_RETRIES = 5;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("campusverse_offline.db").then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS queued_scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qr_token TEXT NOT NULL,
          scan_type TEXT NOT NULL,
          event_id TEXT NOT NULL,
          scanned_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          retry_count INTEGER NOT NULL DEFAULT 0
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

// Skips inserting a duplicate row if the same QR + mode is already queued and
// unsynced — see the report for why this doesn't replace the backend's own
// "already scanned" handling.
export async function enqueueScan(qrToken: string, scanType: ScanType, eventId: string): Promise<{ alreadyQueued: boolean }> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM queued_scans WHERE qr_token = ? AND scan_type = ? AND sync_status IN ('pending', 'failed') LIMIT 1",
    [qrToken, scanType]
  );
  if (existing) return { alreadyQueued: true };

  await db.runAsync(
    "INSERT INTO queued_scans (qr_token, scan_type, event_id, scanned_at, sync_status, retry_count) VALUES (?, ?, ?, ?, 'pending', 0)",
    [qrToken, scanType, eventId, new Date().toISOString()]
  );
  return { alreadyQueued: false };
}

export async function getPendingScans(): Promise<QueuedScan[]> {
  const db = await getDb();
  return db.getAllAsync<QueuedScan>("SELECT * FROM queued_scans WHERE sync_status IN ('pending', 'failed') ORDER BY id ASC");
}

export async function getQueueCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM queued_scans WHERE sync_status IN ('pending', 'failed')");
  return row?.count ?? 0;
}

export async function markScanSyncing(id: number) {
  const db = await getDb();
  await db.runAsync("UPDATE queued_scans SET sync_status = 'syncing' WHERE id = ?", [id]);
}

// The desired end state (attendance recorded) is achieved — remove it from the queue.
export async function markScanSynced(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM queued_scans WHERE id = ?", [id]);
}

export async function markScanFailed(id: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ retry_count: number }>("SELECT retry_count FROM queued_scans WHERE id = ?", [id]);
  const nextRetryCount = (row?.retry_count ?? 0) + 1;
  const nextStatus: SyncStatus = nextRetryCount > MAX_RETRIES ? "failed" : "pending";
  await db.runAsync("UPDATE queued_scans SET retry_count = ?, sync_status = ? WHERE id = ?", [nextRetryCount, nextStatus, id]);
}
