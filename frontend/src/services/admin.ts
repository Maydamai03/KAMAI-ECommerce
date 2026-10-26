import { apiGet } from "../lib/api";
import type { AdminDashboard } from "../types";

export const getAdminDashboard = () => apiGet<AdminDashboard>("/admin/dashboard");