import { useEffect, useState } from "react";
import { getMyDivision as fetchMyDivisionRequest } from "../services/registrations";
import type { StudentDivisionInfo } from "../types/api";

// Module-level cache — shared across every screen that asks for this
// (e.g. every event visited), so navigating between events doesn't
// refetch. Mirrors the web app's module-cached useMyDivision hook.
let cachedPromise: Promise<StudentDivisionInfo | null> | null = null;

function fetchMyDivision(): Promise<StudentDivisionInfo | null> {
  if (!cachedPromise) {
    cachedPromise = fetchMyDivisionRequest().catch(() => null);
  }
  return cachedPromise;
}

/** Call on sign-in/sign-out so a new session doesn't read a previous student's cached data. */
export function resetMyDivisionCache() {
  cachedPromise = null;
}

/**
 * The logged-in student's division + class teacher, fetched once and
 * shared across every consumer. Pass `enabled` (e.g. `user?.role ===
 * "student"`) since the backend endpoint is student-only.
 */
export function useMyDivision(enabled: boolean) {
  const [data, setData] = useState<StudentDivisionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetchMyDivision().then((res) => {
      if (!cancelled) { setData(res); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [enabled]);

  return { data, loading };
}
