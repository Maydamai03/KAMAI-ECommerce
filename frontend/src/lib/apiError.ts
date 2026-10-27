import { ApiError } from "./api";

export function errorText(e: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (e instanceof ApiError) {
    if (Array.isArray(e.details)) {
      const messages = e.details
        .map((d) =>
          d && typeof d === "object" && "message" in d ? String((d as { message: unknown }).message) : ""
        )
        .filter(Boolean);
      if (messages.length > 0) return [...new Set(messages)].slice(0, 5).join(". ");
    }
    return e.message;
  }
  return fallback;
}