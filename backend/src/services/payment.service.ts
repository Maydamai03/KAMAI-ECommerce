import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { authHeader, getServerKey, midtrans } from "../config/midtrans";
import { findOrderForViewer, getOrderForViewer } from "./order.service";
import {
  StockUnavailableError,
  getOrderStatus,
  releaseStock,
  reserveStock,
  transitionOrder,
} from "./order-status";

type Viewer = { id: string; role: string } | undefined;

export const notificationSchema = z
  .object({
    order_id: z.string().min(1),
    status_code: z.string().min(1),
    gross_amount: z.string().min(1),
    signature_key: z.string().min(1),
    transaction_status: z.string().min(1),
    fraud_status: z.string().optional(),
    payment_type: z.string().optional(),
    transaction_id: z.string().optional(),
    settlement_time: z.string().optional(),
  })
  .passthrough();

export type MidtransStatus = {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  gross_amount?: string;
  settlement_time?: string;
  [key: string]: unknown;
};

const gatewayError = () =>
  new AppError(502, "PAYMENT_GATEWAY_ERROR", "Layanan pembayaran sedang bermasalah. Coba lagi sebentar lagi.");

async function midtransFetch(url: string, init: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    console.error("[midtrans] gagal terhubung:", e);
    throw gatewayError();
  }
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, json };
}

// Waktu dari Midtrans berformat "2026-10-21 10:15:30" dalam WIB
function parseMidtransTime(value?: string): Date {
  if (!value) return new Date();
  const date = new Date(`${value.replace(" ", "T")}+07:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

const paymentKey = (orderId: string) => ({
  orderId_provider: { orderId, provider: "midtrans" },
});

/* ------------------------------------------------------------------ */
/* Membuat token Snap                                                  */
/* ------------------------------------------------------------------ */

export async function createPayment(orderNumber: string, viewer: Viewer, email?: string) {
  const order = await findOrderForViewer(orderNumber, viewer, email);

  if (order.status !== "PENDING") {
    throw new AppError(409, "ORDER_NOT_PAYABLE", "Pesanan ini tidak dapat dibayar.");
  }
  if (order.expiresAt.getTime() <= Date.now()) {
    throw new AppError(409, "ORDER_EXPIRED", "Batas waktu pembayaran sudah lewat.");
  }

  // Token yang sama dipakai ulang, jadi tidak ada transaksi ganda untuk satu pesanan
  const existing = await prisma.payment.findUnique({ where: paymentKey(order.id) });
  if (existing?.snapToken && existing.redirectUrl) {
    return { token: existing.snapToken, redirectUrl: existing.redirectUrl };
  }

  const address = order.shippingAddress as unknown as {
    recipientName: string;
    phone: string;
    street: string;
    city: string;
    postalCode: string;
  };

  const itemDetails = order.items.map((i) => ({
    id: i.variantId.slice(0, 50),
    price: i.unitPrice,
    quantity: i.quantity,
    name: `${i.productName} (${i.variantLabel})`.slice(0, 50),
  }));
  if (order.shippingCost > 0) {
    itemDetails.push({ id: "SHIPPING", price: order.shippingCost, quantity: 1, name: "Ongkos kirim" });
  }

  const minutesLeft = Math.max(1, Math.floor((order.expiresAt.getTime() - Date.now()) / 60_000));
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

  const result = await midtransFetch(midtrans.snapUrl, {
    method: "POST",
    body: JSON.stringify({
      transaction_details: { order_id: order.orderNumber, gross_amount: order.total },
      item_details: itemDetails,
      customer_details: {
        first_name: address.recipientName.slice(0, 100),
        email: order.guestEmail ?? undefined,
        phone: address.phone,
        shipping_address: {
          first_name: address.recipientName.slice(0, 100),
          phone: address.phone,
          address: address.street.slice(0, 200),
          city: address.city,
          postal_code: address.postalCode,
          country_code: "IDN",
        },
      },
      // Masa berlaku pembayaran di Midtrans disamakan dengan batas waktu pesanan
      expiry: { unit: "minutes", duration: minutesLeft },
      callbacks: { finish: `${frontendUrl}/orders/${order.orderNumber}` },
    }),
  });

  const token = typeof result.json?.token === "string" ? result.json.token : null;
  const redirectUrl = typeof result.json?.redirect_url === "string" ? result.json.redirect_url : null;

  if (!result.ok || !token || !redirectUrl) {
    console.error("[midtrans] gagal membuat transaksi Snap:", result.status, result.json);

    // Dua permintaan bersamaan: yang kalah memakai token milik pemenang
    const again = await prisma.payment.findUnique({ where: paymentKey(order.id) });
    if (again?.snapToken && again.redirectUrl) {
      return { token: again.snapToken, redirectUrl: again.redirectUrl };
    }
    throw gatewayError();
  }

  await prisma.payment.upsert({
    where: paymentKey(order.id),
    create: {
      orderId: order.id,
      provider: "midtrans",
      providerRef: order.orderNumber,
      status: "PENDING",
      grossAmount: order.total,
      snapToken: token,
      redirectUrl,
    },
    update: { snapToken: token, redirectUrl },
  });

  return { token, redirectUrl };
}

/* ------------------------------------------------------------------ */
/* Memproses status dari Midtrans (webhook maupun sync)                 */
/* ------------------------------------------------------------------ */

export function verifySignature(p: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const expected = createHash("sha512")
    .update(p.order_id + p.status_code + p.gross_amount + getServerKey())
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(p.signature_key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function applyTransactionStatus(orderNumber: string, data: MidtransStatus) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, total: true },
  });
  if (!order) {
    console.warn(`[midtrans] notifikasi untuk pesanan yang tidak dikenal: ${orderNumber}`);
    return "unknown_order";
  }

  // Nominal harus sama dengan total pesanan kita
  if (data.gross_amount !== undefined && Math.round(Number(data.gross_amount)) !== order.total) {
    console.error(
      `[midtrans] nominal tidak cocok untuk ${orderNumber}: ${data.gross_amount} vs ${order.total}`
    );
    return "amount_mismatch";
  }

  const ts = data.transaction_status;
  const fraud = data.fraud_status;
  const isPaid = ts === "settlement" || (ts === "capture" && (!fraud || fraud === "accept"));

  const paymentStatus = isPaid
    ? "SETTLEMENT"
    : ts === "expire"
      ? "EXPIRED"
      : ts === "cancel"
        ? "CANCELLED"
        : ts === "pending" || ts === "capture" || ts === "authorize"
          ? "PENDING"
          : ts === "deny" || ts === "failure"
            ? "FAILED"
            : null;

  // Catatan pembayaran. Pembayaran yang sudah berhasil tidak pernah "diturunkan"
  const existing = await prisma.payment.findUnique({ where: paymentKey(order.id) });
  const keepSettled = existing?.status === "SETTLEMENT" && paymentStatus !== "SETTLEMENT";

  if (!keepSettled) {
    const raw = JSON.parse(JSON.stringify(data)) as Prisma.InputJsonObject;
    await prisma.payment.upsert({
      where: paymentKey(order.id),
      create: {
        orderId: order.id,
        provider: "midtrans",
        providerRef: orderNumber,
        status: paymentStatus ?? "PENDING",
        grossAmount: order.total,
        method: data.payment_type ?? null,
        paidAt: isPaid ? parseMidtransTime(data.settlement_time) : null,
        rawPayload: raw,
      },
      update: {
        ...(paymentStatus ? { status: paymentStatus } : {}),
        method: data.payment_type ?? undefined,
        paidAt: isPaid ? parseMidtransTime(data.settlement_time) : undefined,
        rawPayload: raw,
      },
    });
  }

  // Perubahan status pesanan (idempoten: hanya berubah dari status yang sesuai)
  try {
    return await prisma.$transaction(async (tx) => {
      if (isPaid) {
        const paid = await transitionOrder(
          tx,
          order.id,
          ["PENDING"],
          "PAID",
          `Pembayaran diterima (${data.payment_type ?? "-"})`
        );
        if (paid) return "paid";

        const current = await getOrderStatus(tx, order.id);
        if (current === "EXPIRED" || current === "CANCELLED") {
          await reserveStock(tx, order.id); // melempar bila stok sudah tidak cukup
          await transitionOrder(
            tx,
            order.id,
            ["EXPIRED", "CANCELLED"],
            "PAID",
            "Pembayaran diterima setelah pesanan kedaluwarsa; stok dipesan ulang"
          );
          return "paid_late";
        }
        return "already_processed";
      }

      if (ts === "expire" || ts === "cancel") {
        const target = ts === "expire" ? "EXPIRED" : "CANCELLED";
        const moved = await transitionOrder(tx, order.id, ["PENDING"], target, `Midtrans: ${ts}`);
        if (moved) {
          await releaseStock(tx, order.id);
          return target.toLowerCase();
        }
        return "ignored";
      }

      // pending, deny, failure, dan lainnya: hanya dicatat, pesanan tetap
      return "recorded";
    });
  } catch (e) {
    if (e instanceof StockUnavailableError) {
      const current = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (current) {
        await prisma.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: current.status,
            toStatus: current.status,
            note: "PERLU REFUND MANUAL: pembayaran diterima setelah pesanan kedaluwarsa dan stok sudah habis",
          },
        });
      }
      console.error(`[midtrans] ${orderNumber}: pembayaran diterima tetapi stok habis, perlu refund manual`);
      return "needs_refund";
    }
    throw e;
  }
}

export async function handleNotification(payload: z.infer<typeof notificationSchema>) {
  if (!verifySignature(payload)) {
    throw new AppError(403, "INVALID_SIGNATURE", "Signature tidak valid");
  }
  return applyTransactionStatus(payload.order_id, payload);
}

/* ------------------------------------------------------------------ */
/* Sinkronisasi: tanya langsung ke Midtrans                             */
/* ------------------------------------------------------------------ */

async function fetchMidtransStatus(orderNumber: string): Promise<MidtransStatus | null> {
  const result = await midtransFetch(
    `${midtrans.apiBase}/v2/${encodeURIComponent(orderNumber)}/status`
  );
  const json = result.json;

  if (json && typeof json.transaction_status === "string") {
    return {
      ...json,
      order_id: orderNumber,
      transaction_status: json.transaction_status,
    } as MidtransStatus;
  }

  // 404 artinya pembeli belum memilih metode bayar (belum ada transaksi)
  if (json?.status_code === "404") return null;

  console.error("[midtrans] respons status tidak dikenali:", result.status, json);
  throw gatewayError();
}

/** Dipakai job: samakan status pesanan dengan Midtrans, tanpa pengecekan akses */
export async function reconcilePayment(orderNumber: string) {
  const data = await fetchMidtransStatus(orderNumber);
  if (data) await applyTransactionStatus(orderNumber, data);
}

export async function syncPayment(orderNumber: string, viewer: Viewer, email?: string) {
  await findOrderForViewer(orderNumber, viewer, email); // pengecekan akses
  await reconcilePayment(orderNumber);
  return getOrderForViewer(orderNumber, viewer, email);
}