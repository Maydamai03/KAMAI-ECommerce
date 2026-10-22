import "dotenv/config";

export const mailConfig = {
  host: process.env.SMTP_HOST?.trim() ?? "",
  port: Number(process.env.SMTP_PORT ?? 2525),
  user: process.env.SMTP_USER?.trim() ?? "",
  pass: process.env.SMTP_PASS ?? "",
  from: process.env.MAIL_FROM?.trim() || "Kamai <no-reply@kamai.test>",
  brand: process.env.BRAND_NAME?.trim() || "Kamai",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
};

export const isMailConfigured = () =>
  Boolean(mailConfig.host && mailConfig.user && mailConfig.pass);