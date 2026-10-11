import { apiRequest } from "../api/client";
import type { Application, ApplicationStage, ApplyPayload, RecruitmentDrive } from "../types/api";

// ── Student ─────────────────────────────────────────────────
export const getOpenDrives = () => apiRequest<RecruitmentDrive[]>("/student/recruitment-drives");

export const applyToDrive = (payload: ApplyPayload) =>
  apiRequest<{ message: string; application: Application }>("/student/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMyApplications = () => apiRequest<Application[]>("/student/applications");
export const getMyApplication = (id: string) => apiRequest<Application>(`/student/applications/${id}`);

// ── Club admin ──────────────────────────────────────────────
// Read-only on mobile — drive creation/editing stays web-only (see report).
export const getMyDrives = () => apiRequest<RecruitmentDrive[]>("/club/recruitment-drives");

export const getClubApplications = (params: { drive_id?: string; stage?: ApplicationStage | "all" }) => {
  const qs = new URLSearchParams();
  if (params.drive_id) qs.set("drive_id", params.drive_id);
  if (params.stage && params.stage !== "all") qs.set("stage", params.stage);
  return apiRequest<Application[]>(`/club/applications?${qs}`);
};

export const getClubApplication = (id: string) => apiRequest<Application>(`/club/applications/${id}`);

export const advanceStage = (id: string, stage: "shortlisted" | "rejected" | "selected", note?: string) =>
  apiRequest<{ message: string; application: Application }>(`/club/applications/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage, note }),
  });

export const scheduleInterview = (id: string, payload: { date: string; time: string; venue?: string; meeting_link?: string; note?: string }) =>
  apiRequest<{ message: string; application: Application }>(`/club/applications/${id}/schedule-interview`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const recordFeedback = (id: string, payload: { rating: number; notes?: string; note?: string }) =>
  apiRequest<{ message: string; application: Application }>(`/club/applications/${id}/feedback`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const bulkShortlist = (ids: string[]) =>
  apiRequest<{ message: string; shortlisted: number; skipped: number }>("/club/applications/bulk-shortlist", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
