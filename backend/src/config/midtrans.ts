import "dotenv/config";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const midtrans = {
  isProduction,
  snapUrl: isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions",
  apiBase: isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com",
};

export function getServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diisi di .env");
  return key;
}

export function authHeader(): string {
  return `Basic ${Buffer.from(`${getServerKey()}:`).toString("base64")}`;
}