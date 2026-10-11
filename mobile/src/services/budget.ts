import { apiRequest } from "../api/client";
import type {
  BudgetRequest, BudgetStats, CreateBudgetRequestPayload, UpdateBudgetRequestPayload,
} from "../types/api";

// ── Club admin ──────────────────────────────────────────────
export const getMyBudgetRequests = (status?: string) =>
  apiRequest<BudgetRequest[]>(`/club/budget-requests${status ? `?status=${status}` : ""}`);

export const getMyBudgetRequest = (id: string) =>
  apiRequest<BudgetRequest>(`/club/budget-requests/${id}`);

export const createBudgetRequest = (payload: CreateBudgetRequestPayload) =>
  apiRequest<{ message: string; budgetRequest: BudgetRequest }>("/club/budget-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateBudgetRequest = (id: string, payload: UpdateBudgetRequestPayload) =>
  apiRequest<{ message: string; budgetRequest: BudgetRequest }>(`/club/budget-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// Sets status to "withdrawn" server-side (audit trail) — only while pending.
export const withdrawBudgetRequest = (id: string) =>
  apiRequest<{ message: string; budgetRequest: BudgetRequest }>(`/club/budget-requests/${id}`, {
    method: "DELETE",
  });

// ── Super admin ─────────────────────────────────────────────
export const getAllBudgetRequests = (params?: { status?: string; academic_year?: string }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.academic_year) qs.set("academic_year", params.academic_year);
  const query = qs.toString();
  return apiRequest<BudgetRequest[]>(`/admin/budget-requests${query ? `?${query}` : ""}`);
};

export const approveBudgetRequest = (id: string, amount_approved?: number, admin_remarks?: string) =>
  apiRequest<{ message: string; budgetRequest: BudgetRequest }>(`/admin/budget-requests/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ amount_approved, admin_remarks }),
  });

export const rejectBudgetRequest = (id: string, admin_remarks: string) =>
  apiRequest<{ message: string; budgetRequest: BudgetRequest }>(`/admin/budget-requests/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ admin_remarks }),
  });

export const getBudgetStats = () => apiRequest<BudgetStats>("/admin/budget-stats");
