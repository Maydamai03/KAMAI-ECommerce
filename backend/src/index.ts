import { env } from "./config/env"; // harus pertama: validasi lingkungan sebelum modul lain
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import { storageConfig } from "./config/storage";
import { startExpiryJob } from "./jobs/expireOrders";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { globalLimiter, originGuard, requestLogger } from "./middlewares/security";
import { adminRouter } from "./routes/admin.routes";
import { authRouter } from "./routes/auth.routes";
import { cartRouter } from "./routes/cart.routes";
import { catalogRouter } from "./routes/catalog.routes";
import { meRouter } from "./routes/me.routes";
import { orderRouter } from "./routes/order.routes";
import { paymentRouter } from "./routes/payment.routes";
import { shippingRouter } from "./routes/shipping.routes";
import { seoRouter } from "./routes/seo.routes";

const app = express();

// Diperlukan agar IP asli terbaca di belakang ngrok/hosting (untuk rate limit)
app.set("trust proxy", 1);

app.use(helmet());
if (env.isProduction) app.use(requestLogger);

app.use(
  cors({
    origin: (origin, callback) => {
      // Tanpa Origin (server ke server) diizinkan; selain itu harus ada di daftar
      callback(null, !origin || env.allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// Mode lokal: sajikan berkas unggahan (hanya untuk development)
if (storageConfig.mode === "local") {
  app.use(
    "/uploads",
    (_req, res, next) => {
      // Helmet membatasi sumber daya ke asal yang sama; frontend (port lain) perlu izin ini
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(storageConfig.uploadDir, { maxAge: "7d", index: false })
  );
}

// Tanpa database: untuk health check hosting. Memeriksa DB tiap beberapa detik akan
// menjaga database serverless tetap "bangun" terus dan menghabiskan kuota gratisnya.
app.get("/api/live", (_req, res) => {
  res.json({ ok: true });
});

// Health check (dipakai hosting): ikut memeriksa koneksi database
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api", globalLimiter, originGuard);

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/admin", adminRouter);
app.use("/api", catalogRouter);
app.use("/api", cartRouter);
app.use("/api", orderRouter);
app.use("/api", paymentRouter);
app.use("/api", shippingRouter);
app.use("/api", seoRouter);

// Harus paling bawah
app.use("/api", notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`API berjalan di http://localhost:${env.port} (${env.nodeEnv})`);
  startExpiryJob();
});

function shutdown(signal: string) {
  console.log(`${signal} diterima, menutup server...`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  // Jaga-jaga bila ada koneksi yang menggantung
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("[proses] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[proses] uncaughtException:", err);
  shutdown("uncaughtException");
});