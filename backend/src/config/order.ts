import "dotenv/config";

export const MAX_QTY_PER_LINE = 10;

// Sementara: tarif tetap sampai integrasi ongkir (Fase 4)
export const FLAT_SHIPPING_COST = Number(process.env.FLAT_SHIPPING_COST ?? 15000);

// Batas waktu pembayaran
export const ORDER_EXPIRY_HOURS = Number(process.env.ORDER_EXPIRY_HOURS ?? 24);

// Job kedaluwarsa
export const EXPIRY_GRACE_MINUTES = Number(process.env.EXPIRY_GRACE_MINUTES ?? 2);
export const EXPIRY_JOB_INTERVAL_SECONDS = Number(process.env.EXPIRY_JOB_INTERVAL_SECONDS ?? 300);