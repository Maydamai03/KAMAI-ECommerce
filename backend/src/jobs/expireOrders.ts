import { prisma } from "../lib/prisma";
import { AUTO_COMPLETE_DAYS, EXPIRY_GRACE_MINUTES, EXPIRY_JOB_INTERVAL_SECONDS } from "../config/order";
import { releaseStock, transitionOrder } from "../services/order-status";
import { reconcilePayment } from "../services/payment.service";


const BATCH_SIZE = 50;
const MAX_ROUNDS = 10;

let running = false;

type Result = "expired" | "resolved" | "skipped";

async function expireOne(order: { id: string; orderNumber: string }): Promise<Result> {
  // Kalau pembeli sempat membuka pembayaran, tanya Midtrans dulu:
  // mungkin sudah lunas tetapi webhook-nya terlewat
  const opened = await prisma.payment.findFirst({
    where: { orderId: order.id, snapToken: { not: null } },
    select: { id: true },
  });

  if (opened) {
    try {
      await reconcilePayment(order.orderNumber);
    } catch (e) {
      // Midtrans tidak terjangkau: jangan kedaluwarsakan dulu, coba lagi putaran berikutnya
      console.error(`[job] gagal mengecek Midtrans untuk ${order.orderNumber}:`, e);
      return "skipped";
    }

    const fresh = await prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    if (fresh?.status !== "PENDING") return "resolved"; // sudah PAID/EXPIRED/CANCELLED lewat Midtrans
  }

  return prisma.$transaction(async (tx): Promise<Result> => {
    const moved = await transitionOrder(
      tx,
      order.id,
      ["PENDING"],
      "EXPIRED",
      "Kedaluwarsa otomatis: pembayaran tidak diterima sampai batas waktu"
    );
    if (!moved) return "resolved"; // sudah diubah proses lain

    await releaseStock(tx, order.id);
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    return "expired";
  });
}

async function autoCompleteShipped() {
  const cutoff = new Date(Date.now() - AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000);

  const due = await prisma.order.findMany({
    where: { status: "SHIPPED", shipment: { is: { shippedAt: { lt: cutoff } } } },
    select: { id: true, orderNumber: true },
    take: 50,
  });

  for (const order of due) {
    try {
      const done = await prisma.$transaction(async (tx) => {
        const moved = await transitionOrder(
          tx,
          order.id,
          ["SHIPPED"],
          "COMPLETED",
          `Selesai otomatis ${AUTO_COMPLETE_DAYS} hari setelah dikirim`
        );
        if (moved) {
          await tx.shipment.updateMany({ where: { orderId: order.id }, data: { deliveredAt: new Date() } });
        }
        return moved;
      });
      if (done) console.log(`[job] ${order.orderNumber} selesai otomatis`);
    } catch (e) {
      console.error(`[job] gagal menyelesaikan ${order.orderNumber}:`, e);
    }
  }
}

export async function runExpiryJob() {
  if (running) return; // jangan menumpuk bila putaran sebelumnya belum selesai
  running = true;

  let expired = 0;
  try {
    const cutoff = new Date(Date.now() - EXPIRY_GRACE_MINUTES * 60_000);

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const due = await prisma.order.findMany({
        where: { status: "PENDING", expiresAt: { lt: cutoff } },
        select: { id: true, orderNumber: true },
        orderBy: { expiresAt: "asc" },
        take: BATCH_SIZE,
      });
      if (due.length === 0) break;

      let progressed = 0;
      for (const order of due) {
        try {
          const result = await expireOne(order);
          if (result === "expired") expired++;
          if (result !== "skipped") progressed++;
        } catch (e) {
          console.error(`[job] gagal memproses ${order.orderNumber}:`, e);
        }
      }
      if (progressed === 0) break; // semua dilewati; tunggu putaran berikutnya
    }

    await autoCompleteShipped();
    
    if (expired > 0) console.log(`[job] ${expired} pesanan dikedaluwarsakan`);
  } finally {
    running = false;
  }
}

export function startExpiryJob() {
  const run = () => {
    runExpiryJob().catch((e) => console.error("[job] kegagalan tak terduga:", e));
  };

  setTimeout(run, 5_000); // sekali saat server baru menyala
  setInterval(run, EXPIRY_JOB_INTERVAL_SECONDS * 1000);
  console.log(
    `[job] kedaluwarsa pesanan aktif (tiap ${EXPIRY_JOB_INTERVAL_SECONDS} detik, tenggang ${EXPIRY_GRACE_MINUTES} menit)`
  );
}