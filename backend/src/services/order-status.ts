import type { Prisma } from "../../generated/prisma/client";

export type OrderStatusName =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export class StockUnavailableError extends Error {}

type Tx = Prisma.TransactionClient;

// Mengunci baris pesanan: dua proses (webhook dan sync) tidak bisa mengubahnya bersamaan
async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
}

export async function getOrderStatus(tx: Tx, orderId: string): Promise<OrderStatusName | null> {
  const row = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
  return (row?.status as OrderStatusName | undefined) ?? null;
}

/** Mengubah status hanya jika status saat ini ada di daftar `from`. Mengembalikan true bila berubah. */
export async function transitionOrder(
  tx: Tx,
  orderId: string,
  from: OrderStatusName[],
  to: OrderStatusName,
  note?: string,
  actorId?: string
): Promise<boolean> {
  await lockOrder(tx, orderId);
  const current = await getOrderStatus(tx, orderId);
  if (!current || !from.includes(current)) return false;

  await tx.order.update({ where: { id: orderId }, data: { status: to } });
  await tx.orderStatusLog.create({
    data: { orderId, fromStatus: current, toStatus: to, actorId: actorId ?? null, note: note ?? null },
  });
  return true;
}

export async function releaseStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { variantId: true, quantity: true },
    orderBy: { variantId: "asc" },
  });
  for (const item of items) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/** Memesan ulang stok. Melempar StockUnavailableError (transaksi dibatalkan) bila ada yang tidak cukup. */
export async function reserveStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { variantId: true, quantity: true },
    orderBy: { variantId: "asc" },
  });
  for (const item of items) {
    const result = await tx.productVariant.updateMany({
      where: { id: item.variantId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (result.count === 0) throw new StockUnavailableError();
  }
}