import { apiRequest } from "../api/client";
import type { Certificate } from "../types/api";
export const getMyCertificates = () => apiRequest<Certificate[]>("/student/my-certificates");
