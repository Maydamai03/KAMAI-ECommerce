import { apiGet, apiPost, apiPut } from "../lib/api";
import type { User } from "../types";

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function registerUser(input: RegisterInput) {
  return apiPost<{ user: User }>("/auth/register", input);
}

export function loginUser(input: LoginInput) {
  return apiPost<{ user: User }>("/auth/login", input);
}

export function logoutUser() {
  return apiPost<null>("/auth/logout");
}

export function getMe() {
  return apiGet<{ user: User }>("/auth/me");
}

export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return apiPut<null>("/me/password", input);
}