import { prisma } from "../lib/prisma";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 3;
const REVENUE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;
const ALL_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
] as const;

// Awal hari menurut WIB (UTC+7, tanpa waktu musim panas)
function startOfDayWib(date = new Date()): Date {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - WIB_OFFSET_MS);
}

const dayKey = (date: Date) => new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

export async function getDashboard() {
  const todayStart = startOfDayWib();
  const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);

  const [ordersToday, statusGroups, payments, lowStock, recentOrders, productCount, customerCount] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.payment.findMany({
        where: {
          status: "SETTLEMENT",
          paidAt: { gte: weekStart },
          order: { status: { in: [...REVENUE_STATUSES] } },
        },
        select: { paidAt: true, grossAmount: true },
      }),
      prisma.productVariant.findMany({
        where: {
          isActive: true,
          stock: { lte: LOW_STOCK_THRESHOLD },
          product: { isActive: true, deletedAt: null },
        },
        orderBy: [{ stock: "asc" }, { sku: "asc" }],
        take: 10,
        include: { product: { select: { name: true, slug: true } } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          shippingAddress: true,
        },
      }),
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

  const statusCounts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    (typeof ALL_STATUSES)[number],
    number
  >;
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;

  // Pendapatan per hari (7 hari terakhir, termasuk hari ini)
  const perDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    perDay.set(dayKey(new Date(weekStart.getTime() + i * DAY_MS)), 0);
  }
  let revenue7Days = 0;
  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = dayKey(p.paidAt);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + p.grossAmount);
    revenue7Days += p.grossAmount;
  }

  return {
    ordersToday,
    needsProcessing: statusCounts.PAID,
    revenue7Days,
    productCount,
    customerCount,
    statusCounts,
    revenueByDay: [...perDay.entries()].map(([date, total]) => ({ date, total })),
    lowStock: lowStock.map((v) => ({
      id: v.id,
      productName: v.product.name,
      slug: v.product.slug,
      variant: `${v.color} / ${v.size}`,
      stock: v.stock,
    })),
    recentOrders: recentOrders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      recipient: (o.shippingAddress as { recipientName?: string } | null)?.recipientName ?? "-",
    })),
  };
}