import "dotenv/config";
import { createHash } from "node:crypto";

const [orderNumber, status = "settlement", amount, mode] = process.argv.slice(2);

if (!orderNumber || !amount) {
  console.error("Pemakaian: node scripts/fake-webhook.mjs <orderNumber> <status> <total> [bad]");
  console.error("status: settlement | pending | expire | cancel | deny");
  process.exit(1);
}

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const statusCode = { pending: "201", expire: "407", deny: "202", cancel: "200", settlement: "200" }[status] ?? "200";
const gross = Number(amount).toFixed(2);

let signature = createHash("sha512")
  .update(orderNumber + statusCode + gross + serverKey)
  .digest("hex");
if (mode === "bad") signature = signature.replace(/.$/, signature.endsWith("0") ? "1" : "0");

const res = await fetch("http://localhost:5000/api/payments/midtrans/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    order_id: orderNumber,
    status_code: statusCode,
    gross_amount: gross,
    signature_key: signature,
    transaction_status: status,
    fraud_status: "accept",
    payment_type: "bank_transfer",
    transaction_id: `fake-${Date.now()}`,
    settlement_time: "2026-10-21 10:15:30",
  }),
});

console.log(res.status, await res.text());


