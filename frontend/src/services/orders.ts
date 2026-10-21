import { apiGet, apiPost } from "../lib/api";
import type { AddressInput, Order, OrderSummary, Pagination } from "../types";

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

export const payOrder = (orderNumber: string, email?: string) =>
  apiPost<{ token: string; redirectUrl: string }>(`/orders/${orderNumber}/pay`, { email });

export const syncOrder = (orderNumber: string, email?: string) =>
  apiPost<Order>(`/orders/${orderNumber}/sync`, { email });

export const getMyOrders = (page: number) =>
  apiGet<{ items: OrderSummary[]; pagination: Pagination }>("/me/orders", { page, limit: 5 });