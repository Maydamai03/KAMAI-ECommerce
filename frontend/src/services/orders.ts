import { apiGet, apiPost } from "../lib/api";
import type { AddressInput, Order } from "../types";

export interface CreateOrderInput {
  items: { variantId: string; quantity: number }[];
  addressId?: string; // pengguna login
  address?: AddressInput; // tamu
  email?: string; // tamu
  notes?: string;
}

export const createOrder = (input: CreateOrderInput) => apiPost<Order>("/orders", input);

export const getOrder = (orderNumber: string, email?: string) =>
  apiGet<Order>(`/orders/${orderNumber}`, { email });