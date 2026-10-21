import type { OrderStatus } from "../types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Sudah dibayar",
  PROCESSING: "Sedang diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CANCELLED: "bg-red-100 text-red-800",
};