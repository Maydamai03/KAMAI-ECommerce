import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1, "wajib diisi"),
  JWT_SECRET: z.string().min(32, "minimal 32 karakter"),
  FRONTEND_URL: z.string().min(1, "wajib diisi"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  STORAGE: z.enum(["local", "cloudinary"]).default("local"),
  SHIPPING_PROVIDER: z.string().default("mock"),
});

const errors: string[] = [];
const warnings: string[] = [];

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    errors.push(`${issue.path.join(".") || "env"}: ${issue.message}`);
  }
}

// FRONTEND_URL boleh berisi beberapa alamat dipisah koma
const allowedOrigins: string[] = [];
for (const part of (process.env.FRONTEND_URL ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
  try {
    const url = new URL(part);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push(`FRONTEND_URL: "${part}" harus diawali http:// atau https://`);
    } else {
      allowedOrigins.push(url.origin);
    }
  } catch {
    errors.push(`FRONTEND_URL: "${part}" bukan URL yang valid`);
  }
}

// Alamat publik toko (untuk sitemap dan pratinjau tautan); bawaannya FRONTEND_URL pertama
let siteUrl = allowedOrigins[0] ?? "";
const siteRaw = process.env.SITE_URL?.trim();
if (siteRaw) {
  try {
    const url = new URL(siteRaw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push(`SITE_URL: "${siteRaw}" harus diawali http:// atau https://`);
    } else {
      siteUrl = url.origin;
    }
  } catch {
    errors.push(`SITE_URL: "${siteRaw}" bukan URL yang valid`);
  }
}

if (parsed.success && parsed.data.NODE_ENV === "production") {
  const d = parsed.data;

  if (allowedOrigins.some((o) => !o.startsWith("https://"))) {
    errors.push("FRONTEND_URL: di production semua alamat harus https://");
  }
    if (!siteUrl.startsWith("https://")) {
    errors.push("SITE_URL: di production harus https://");
  }
  if (/ganti|changeme|contoh/i.test(d.JWT_SECRET)) {
    errors.push("JWT_SECRET: tampaknya masih nilai contoh; buat string acak baru");
  }
  if (d.STORAGE !== "cloudinary") {
    errors.push("STORAGE: di production harus 'cloudinary' (disk server hilang saat restart atau deploy)");
  } else {
    const url = process.env.CLOUDINARY_URL ?? "";
    if (!url.startsWith("cloudinary://") || url.includes("<")) {
      errors.push("CLOUDINARY_URL: belum diisi dengan benar");
    }
  }
  if (d.SHIPPING_PROVIDER === "mock") {
    errors.push("SHIPPING_PROVIDER: 'mock' tidak boleh dipakai di production (gunakan 'manual' atau 'biteship')");
  }
  if (!process.env.MIDTRANS_SERVER_KEY?.trim() || !process.env.MIDTRANS_CLIENT_KEY?.trim()) {
    errors.push("MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY wajib diisi");
  }
  if (process.env.MIDTRANS_IS_PRODUCTION !== "true") {
    warnings.push("MIDTRANS_IS_PRODUCTION bukan 'true': pembayaran memakai SANDBOX (wajar untuk staging)");
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    warnings.push("SMTP belum lengkap: email notifikasi tidak akan terkirim");
  }
  if (d.COOKIE_SAMESITE === "none") {
    warnings.push("COOKIE_SAMESITE=none: pakai hanya jika frontend dan API beda domain; sebaiknya satu domain induk");
  }
}

if (errors.length > 0 || !parsed.success) {
  console.error("\nKonfigurasi lingkungan tidak valid:\n" + errors.map((e) => `  - ${e}`).join("\n") + "\n");
  process.exit(1);
}

for (const w of warnings) console.warn(`[konfigurasi] ${w}`);

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === "production",
  port: parsed.data.PORT,
  allowedOrigins,
  cookieSameSite: parsed.data.COOKIE_SAMESITE,
  siteUrl,
};