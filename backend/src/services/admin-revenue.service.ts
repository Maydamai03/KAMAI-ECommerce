import { z } from "zod";
import { prisma } from "../lib/prisma";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REVENUE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] as const;

export const revenueQuerySchema = z.object({
  range: z.enum(["7d", "30d", "12m"]).default("7d"),
});
export type RevenueRange = z.infer<typeof revenueQuerySchema>["range"];

const pad = (n: number) => String(n).padStart(2, "0");

// Tanggal menurut WIB (UTC+7, tanpa waktu musim panas)
function wib(date: Date) {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

const dayKey = (date: Date) => {
  const p = wib(date);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
};

const monthKey = (date: Date) => {
  const p = wib(date);
  return `${p.y}-${pad(p.m + 1)}`;
};

const startOfDayWib = (date: Date) => {
  const p = wib(date);
  return new Date(Date.UTC(p.y, p.m, p.d) - WIB_OFFSET_MS);
};

const startOfMonthWib = (date: Date, monthsBack: number) => {
  const p = wib(date);
  return new Date(Date.UTC(p.y, p.m - monthsBack, 1) - WIB_OFFSET_MS);
};

export async function getRevenueSeries(range: RevenueRange) {
  const now = new Date();

  let start: Date;
  let keys: string[];
  let keyOf: (d: Date) => string;

  if (range === "12m") {
    start = startOfMonthWib(now, 11);
    keys = Array.from({ length: 12 }, (_, i) => monthKey(startOfMonthWib(now, 11 - i)));
    keyOf = monthKey;
  } else {
    const days = range === "7d" ? 7 : 30;
    start = new Date(startOfDayWib(now).getTime() - (days - 1) * DAY_MS);
    keys = Array.from({ length: days }, (_, i) => dayKey(new Date(start.getTime() + i * DAY_MS)));
    keyOf = dayKey;
  }

  const payments = await prisma.payment.findMany({
    where: {
      status: "SETTLEMENT",
      paidAt: { gte: start },
      order: { status: { in: [...REVENUE_STATUSES] } },
    },
    select: { paidAt: true, grossAmount: true, orderId: true },
  });

  const buckets = new Map(keys.map((k) => [k, { total: 0, orders: new Set<string>() }]));
  const allOrders = new Set<string>();

  for (const p of payments) {
    if (!p.paidAt) continue;
    const bucket = buckets.get(keyOf(p.paidAt));
    if (!bucket) continue;
    bucket.total += p.grossAmount;
    bucket.orders.add(p.orderId);
    allOrders.add(p.orderId);
  }

  const points = keys.map((key) => {
    const b = buckets.get(key)!;
    return { key, total: b.total, orders: b.orders.size };
  });

  return {
    range,
    buckets: points,
    total: points.reduce((sum, p) => sum + p.total, 0),
    orders: allOrders.size,
  };
}