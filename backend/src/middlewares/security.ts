import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Menolak permintaan pengubah data dari asal yang tidak dikenal (perlindungan CSRF).
 * Permintaan tanpa header Origin (server ke server, seperti webhook Midtrans, atau alat uji) diizinkan.
 */
export const originGuard: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !env.allowedOrigins.includes(origin)) {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN_ORIGIN", message: "Permintaan dari asal yang tidak diizinkan." },
    });
    return;
  }
  next();
};

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Notifikasi Midtrans datang dari server mereka dan tidak boleh dibatasi
  skip: (req) => req.path.startsWith("/payments/midtrans/webhook"),
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
  },
});

/** Log satu baris per permintaan, tanpa query string (bisa memuat email) */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split("?")[0];
    if (path === "/api/health") return;
    console.log(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
};