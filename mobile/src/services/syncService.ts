import { ApiError } from "../api/client";
import { scanEntry, scanExit } from "./attendance";
import { getPendingScans, markScanFailed, markScanSynced, markScanSyncing } from "./offlineQueue";

export type SyncState = { syncing: boolean; total: number; completed: number };

let isSyncing = false;
let listener: ((state: SyncState) => void) | null = null;

export function setSyncListener(fn: ((state: SyncState) => void) | null) {
  listener = fn;
}

// Sequential, one scan at a time — avoids racing the same registration
// through entry/exit twice and keeps queue-order (entry before exit) intact.
export async function processQueue() {
  if (isSyncing) return;

  const scans = await getPendingScans();
  if (scans.length === 0) return;

  isSyncing = true;
  listener?.({ syncing: true, total: scans.length, completed: 0 });

  for (let i = 0; i < scans.length; i++) {
    const scan = scans[i];
    try {
      await markScanSyncing(scan.id);
      if (scan.scan_type === "entry") await scanEntry(scan.qr_token);
      else await scanExit(scan.qr_token);
      await markScanSynced(scan.id);
    } catch (cause) {
      // "Already scanned" means the desired end state is already true server-side —
      // treat it as done, not as a failure to retry forever.
      const alreadyScanned = cause instanceof ApiError && cause.message.toLowerCase().includes("already scanned");
      if (alreadyScanned) {
        await markScanSynced(scan.id);
      } else {
        await markScanFailed(scan.id);
      }
    }
    listener?.({ syncing: true, total: scans.length, completed: i + 1 });
  }

  isSyncing = false;
  listener?.({ syncing: false, total: scans.length, completed: scans.length });
}
