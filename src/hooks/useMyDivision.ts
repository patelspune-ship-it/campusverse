import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export interface MyDivisionData {
  has_division: boolean;
  division: {
    _id: string;
    name: string;
    year: string;
    department: { _id: string; name: string; code: string } | null;
    institute: { _id: string; name: string } | null;
  } | null;
  has_class_teacher: boolean;
  class_teacher: { _id: string; full_name: string; faculty_code: string } | null;
}

// Module-level cache so every component using this hook (e.g. every
// EventCard on a page) shares one request instead of firing one per card.
let cachedPromise: Promise<MyDivisionData | null> | null = null;

function fetchMyDivision(): Promise<MyDivisionData | null> {
  if (!cachedPromise) {
    cachedPromise = apiRequest("/api/student/my-division")
      .then((data) => (data && typeof data.has_division === "boolean" ? data : null))
      .catch(() => null);
  }
  return cachedPromise;
}

/** Call after login/logout so a new session doesn't read a previous student's cached data. */
export function resetMyDivisionCache() {
  cachedPromise = null;
}

/**
 * The logged-in student's division + class teacher, fetched once and
 * shared across every consumer. No-ops (returns loading: false, data:
 * null) for non-student roles or logged-out visitors.
 */
export function useMyDivision() {
  const [data, setData]       = useState<MyDivisionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("cv_user") || "null");
    if (user?.role !== "student") return;

    let cancelled = false;
    setLoading(true);
    fetchMyDivision().then((res) => {
      if (!cancelled) { setData(res); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
