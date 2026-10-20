import { apiPost } from "../lib/api";
import type { CartValidation } from "../types";

export function validateCart(items: { variantId: string; quantity: number }[]) {
  return apiPost<CartValidation>("/cart/validate", { items });
}