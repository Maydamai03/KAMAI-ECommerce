import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { blankToUndefined } from "../lib/slug";
import { getOrderStatus, releaseStock, transitionOrder } from "./order-status";
import type { OrderStatusName } from "./order-status";
import { notifyOrderShipped } from "./notification.service";

const ALL_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
] as const;

const STATUS_LABEL: Record<OrderStatusName, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Sudah dibayar",
  PROCESSING: "Sedang diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

type AdminTarget = "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";

// Status tujuan -> status asal yang diperbolehkan
const ALLOWED_FROM: Record<AdminTarget, OrderStatusName[]> = {
  PROCESSING: ["PAID"],
  SHIPPED: ["PROCESSING"],
  COMPLETED: ["SHIPPED"],
  CANCELLED: ["PENDING", "PAID", "PROCESSING"],
};

function nextStatuses(current: OrderStatusName): AdminTarget[] {
  return (Object.keys(ALLOWED_FROM) as AdminTarget[]).filter((t) => ALLOWED_FROM[t].includes(current));
}

/* ------------------------------------------------------------------ */
/* Skema                                                               */
/* ------------------------------------------------------------------ */

const optionalText = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const trackingField = z
  .string()
  .trim()
  .min(3, "Nomor resi minimal 3 karakter")
  .max(60)
  .regex(/^[A-Za-z0-9._/-]+$/, "Nomor resi hanya boleh huruf, angka, titik, garis miring, dan tanda hubung");

export const orderListQuerySchema = z.object({
  status: z.enum(ALL_STATUSES).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const statusChangeSchema = z
  .object({
    status: z.enum(["PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"]),
    note: optionalText(500),
    courier: optionalText(60),
    trackingNumber: z.preprocess(blankToUndefined, trackingField.optional()),
  })
  .superRefine((v, ctx) => {
    if (v.status === "SHIPPED" && !v.trackingNumber) {
      ctx.addIssue({ code: "custom", message: "Nomor resi wajib diisi", path: ["trackingNumber"] });
    }
    if (v.status === "CANCELLED" && (!v.note || v.note.length < 3)) {
      ctx.addIssue({
        code: "custom",
        message: "Alasan pembatalan wajib diisi (minimal 3 karakter)",
        path: ["note"],
      });
    }
  });

export const noteSchema = z.object({
  note: z.string().trim().min(2, "Catatan minimal 2 karakter").max(500),
});

export const shipmentSchema = z.object({
  trackingNumber: trackingField,
  courier: optionalText(60),
});

/* ------------------------------------------------------------------ */
/* Daftar                                                              */
/* ------------------------------------------------------------------ */

export async function listAdminOrders(q: z.infer<typeof orderListQuerySchema>) {
  const where: Prisma.OrderWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? {
          OR: [
            { orderNumber: { contains: q.q, mode: "insensitive" } },
            { guestEmail: { contains: q.q, mode: "insensitive" } },
            { guestPhone: { contains: q.q } },
          ],
        }
      : {}),
  };

  const [[total, rows], groups] = await Promise.all([
    prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          items: { select: { quantity: true } },
          shipment: { select: { trackingNumber: true } },
        },
      }),
    ]),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    (typeof ALL_STATUSES)[number],
    number
  >;
  for (const g of groups) counts[g.status] = g._count._all;

  return {
    items: rows.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      recipient: (o.shippingAddress as { recipientName?: string } | null)?.recipientName ?? "-",
      email: o.guestEmail,
      phone: o.guestPhone,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      courier: [o.courierCompany, o.courierService].filter(Boolean).join(" ") || null,
      trackingNumber: o.shipment?.trackingNumber ?? null,
    })),
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    },
    counts,
  };
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export async function getAdminOrder(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { orderBy: { productName: "asc" } },
      payments: true,
      shipment: true,
      statusLogs: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan");

  const actorIds = [...new Set(order.statusLogs.map((l) => l.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  const status = order.status as OrderStatusName;
  const paymentSettled = order.payments.some((p) => p.status === "SETTLEMENT");

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    email: order.guestEmail,
    phone: order.guestPhone,
    customer: order.user,
    customerNotes: order.notes,
    address: order.shippingAddress as unknown as {
      recipientName: string;
      phone: string;
      province: string;
      city: string;
      district: string;
      postalCode: string;
      street: string;
      note: string | null;
    },
    courierCompany: order.courierCompany,
    courierService: order.courierService,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      variantLabel: i.variantLabel,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.unitPrice * i.quantity,
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      grossAmount: p.grossAmount,
      paidAt: p.paidAt,
      providerRef: p.providerRef,
      fraudStatus: (p.rawPayload as { fraud_status?: string } | null)?.fraud_status ?? null,
    })),
    shipment: order.shipment
      ? {
          courier: order.shipment.courier,
          trackingNumber: order.shipment.trackingNumber,
          shippedAt: order.shipment.shippedAt,
          deliveredAt: order.shipment.deliveredAt,
        }
      : null,
    history: order.statusLogs.map((l) => ({
      id: l.id,
      fromStatus: l.fromStatus,
      toStatus: l.toStatus,
      note: l.note,
      createdAt: l.createdAt,
      actor: l.actorId ? (actorName.get(l.actorId) ?? "Admin") : null,
    })),
    nextStatuses: nextStatuses(status),
    paymentSettled,
    refundNeeded: status === "CANCELLED" && paymentSettled,
  };
}

/* ------------------------------------------------------------------ */
/* Ubah status                                                         */
/* ------------------------------------------------------------------ */

export async function changeOrderStatus(
  orderNumber: string,
  input: z.infer<typeof statusChangeSchema>,
  adminId: string
) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, courierCompany: true, courierService: true },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan");

  const target = input.status;
  const note =
    target === "SHIPPED"
      ? `Dikirim. Resi: ${input.trackingNumber}${input.note ? `. ${input.note}` : ""}`
      : target === "CANCELLED"
        ? `Dibatalkan admin: ${input.note}`
        : (input.note ?? (target === "PROCESSING" ? "Mulai diproses" : "Ditandai selesai"));

  await prisma.$transaction(async (tx) => {
    const moved = await transitionOrder(tx, order.id, ALLOWED_FROM[target], target, note, adminId);
    if (!moved) {
      const current = await getOrderStatus(tx, order.id);
      throw new AppError(
        409,
        "INVALID_TRANSITION",
        `Status pesanan saat ini "${current ? STATUS_LABEL[current] : "-"}". Perubahan ke "${STATUS_LABEL[target]}" tidak diperbolehkan.`
      );
    }

    if (target === "CANCELLED") {
      await releaseStock(tx, order.id);
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      // Pembayaran yang sudah diterima tidak dikembalikan otomatis
      const settled = await tx.payment.count({ where: { orderId: order.id, status: "SETTLEMENT" } });
      if (settled > 0) {
        await tx.orderStatusLog.create({
          data: {
            orderId: order.id,
            fromStatus: "CANCELLED",
            toStatus: "CANCELLED",
            actorId: adminId,
            note: "PERLU REFUND MANUAL: pesanan dibatalkan setelah pembayaran diterima. Lakukan refund lewat dashboard Midtrans.",
          },
        });
      }
    }

    if (target === "SHIPPED") {
      const courier =
        input.courier ??
        ([order.courierCompany, order.courierService].filter(Boolean).join(" ") || "-");
      await tx.shipment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          courier,
          trackingNumber: input.trackingNumber as string,
          shippedAt: new Date(),
        },
        update: { courier, trackingNumber: input.trackingNumber as string, shippedAt: new Date() },
      });
    }

    if (target === "COMPLETED") {
      await tx.shipment.updateMany({ where: { orderId: order.id }, data: { deliveredAt: new Date() } });
    }
  });

  // Email dikirim setelah database berhasil diperbarui, di belakang layar
  if (target === "SHIPPED" && input.trackingNumber) {
    void notifyOrderShipped(orderNumber, input.trackingNumber);
  }

  return getAdminOrder(orderNumber);
}

/* ------------------------------------------------------------------ */
/* Catatan dan nomor resi                                              */
/* ------------------------------------------------------------------ */

export async function addOrderNote(orderNumber: string, note: string, adminId: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan");

  await prisma.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      actorId: adminId,
      note,
    },
  });
  return getAdminOrder(orderNumber);
}

export async function updateShipment(
  orderNumber: string,
  input: z.infer<typeof shipmentSchema>,
  adminId: string
) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { shipment: true },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan");
  if (!order.shipment) {
    throw new AppError(409, "NOT_SHIPPED", "Pesanan ini belum dikirim, jadi belum punya nomor resi.");
  }

  await prisma.$transaction([
    prisma.shipment.update({
      where: { orderId: order.id },
      data: {
        trackingNumber: input.trackingNumber,
        ...(input.courier ? { courier: input.courier } : {}),
      },
    }),
    prisma.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actorId: adminId,
        note: `Nomor resi diubah: ${order.shipment.trackingNumber} menjadi ${input.trackingNumber}`,
      },
    }),
  ]);
  return getAdminOrder(orderNumber);
}