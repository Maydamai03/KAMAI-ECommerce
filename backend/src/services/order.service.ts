import { randomInt } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { addressSchema } from "./address.service";
import {
  FLAT_SHIPPING_COST,
  MAX_QTY_PER_LINE,
  ORDER_EXPIRY_HOURS,
} from "../config/order";

const guestAddressSchema = addressSchema.omit({ isDefault: true });

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
      })
    )
    .min(1, "Keranjang kosong")
    .max(50),
  addressId: z.string().min(1).max(100).optional(), // pengguna login
  address: guestAddressSchema.optional(), // tamu
  email: z.string().trim().toLowerCase().email().optional(), // tamu
  notes: z.string().trim().max(300).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

type AddressSnapshot = {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  note: string | null;
};

const orderInclude = {
  items: { orderBy: { productName: "asc" } },
} satisfies Prisma.OrderInclude;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa karakter yang mirip (0/O, 1/I)

function generateOrderNumber(): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })
    .format(new Date())
    .replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `ORD-${date}-${suffix}`;
}

function toOrderView(order: OrderRecord) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
    email: order.guestEmail,
    notes: order.notes,
    shippingAddress: order.shippingAddress as unknown as AddressSnapshot,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      variantLabel: i.variantLabel,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.unitPrice * i.quantity,
    })),
  };
}

export async function createOrder(
  input: CreateOrderInput,
  user?: { id: string; email: string }
) {
  // 1. Kontak dan alamat pengiriman
  let address: AddressSnapshot;
  let email: string;

  if (user) {
    if (!input.addressId) {
      throw new AppError(400, "ADDRESS_REQUIRED", "Pilih alamat pengiriman");
    }
    const saved = await prisma.address.findFirst({
      where: { id: input.addressId, userId: user.id },
    });
    if (!saved) throw new AppError(400, "ADDRESS_NOT_FOUND", "Alamat tidak ditemukan");

    address = {
      recipientName: saved.recipientName,
      phone: saved.phone,
      province: saved.province,
      city: saved.city,
      district: saved.district,
      postalCode: saved.postalCode,
      street: saved.street,
      note: saved.note,
    };
    email = user.email;
  } else {
    if (!input.address || !input.email) {
      throw new AppError(400, "CONTACT_REQUIRED", "Email dan alamat pengiriman wajib diisi");
    }
    address = {
      recipientName: input.address.recipientName,
      phone: input.address.phone,
      province: input.address.province,
      city: input.address.city,
      district: input.address.district,
      postalCode: input.address.postalCode,
      street: input.address.street,
      note: input.address.note || null,
    };
    email = input.email;
  }

  // 2. Gabungkan item yang variannya sama
  const merged = new Map<string, number>();
  for (const item of input.items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }
  for (const qty of merged.values()) {
    if (qty > MAX_QTY_PER_LINE) {
      throw new AppError(400, "QUANTITY_LIMIT", `Maksimal ${MAX_QTY_PER_LINE} per item`);
    }
  }
  // Urutan tetap mencegah deadlock saat dua pesanan memperbarui varian yang sama
  const variantIds = [...merged.keys()].sort();

  // 3. Transaksi. Diulang kalau nomor pesanan kebetulan bentrok (sangat jarang)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: {
              select: { name: true, basePrice: true, isActive: true, deletedAt: true },
            },
          },
        });
        const byId = new Map(variants.map((v) => [v.id, v]));

        const problems: { variantId: string; issue: string }[] = [];
        const lines: { variant: (typeof variants)[number]; quantity: number; unitPrice: number }[] = [];

        for (const id of variantIds) {
          const quantity = merged.get(id) ?? 0;
          const v = byId.get(id);

          if (!v || !v.isActive || !v.product.isActive || v.product.deletedAt) {
            problems.push({ variantId: id, issue: "UNAVAILABLE" });
            continue;
          }
          if (v.stock < quantity) {
            problems.push({
              variantId: id,
              issue: v.stock === 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
            });
            continue;
          }
          lines.push({
            variant: v,
            quantity,
            unitPrice: v.priceOverride ?? v.product.basePrice, // harga dari database
          });
        }

        if (problems.length > 0) {
          throw new AppError(
            409,
            "CART_INVALID",
            "Beberapa item tidak tersedia atau stoknya berkurang.",
            problems
          );
        }

        // Kurangi stok secara atomik; gagal bila stok sudah tidak cukup
        for (const line of lines) {
          const result = await tx.productVariant.updateMany({
            where: { id: line.variant.id, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (result.count === 0) {
            throw new AppError(
              409,
              "CART_INVALID",
              "Stok berubah saat pesanan diproses.",
              [{ variantId: line.variant.id, issue: "INSUFFICIENT_STOCK" }]
            );
          }
        }

        const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
        const shippingCost = FLAT_SHIPPING_COST;

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId: user?.id ?? null,
            guestEmail: email, // email kontak untuk semua pesanan
            guestPhone: address.phone,
            status: "PENDING",
            subtotal,
            shippingCost,
            total: subtotal + shippingCost,
            shippingAddress: address,
            expiresAt: new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000),
            notes: input.notes || null,
            items: {
              create: lines.map((l) => ({
                variantId: l.variant.id,
                productName: l.variant.product.name,
                variantLabel: `${l.variant.color} / ${l.variant.size}`,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
              })),
            },
            statusLogs: {
              create: {
                fromStatus: null,
                toStatus: "PENDING",
                actorId: user?.id ?? null,
                note: "Pesanan dibuat",
              },
            },
          },
          include: orderInclude,
        });

        return toOrderView(order);
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue; // nomor pesanan bentrok
      throw e;
    }
  }

  throw new AppError(500, "ORDER_NUMBER_FAILED", "Gagal membuat nomor pesanan. Coba lagi.");
}

export async function findOrderForViewer(
  orderNumber: string,
  viewer?: { id: string; role: string },
  email?: string
): Promise<OrderRecord> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  });

  // Pesanan orang lain dijawab "tidak ditemukan", agar keberadaannya tidak bocor
  const notFound = new AppError(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan");
  if (!order) throw notFound;

  const isOwner = Boolean(viewer && order.userId === viewer.id);
  const isAdmin = viewer?.role === "ADMIN";
  const emailMatches = Boolean(
    email && order.guestEmail && order.guestEmail.toLowerCase() === email.trim().toLowerCase()
  );
  const guestOrder = order.userId === null;

  if (!isOwner && !isAdmin && !(guestOrder && emailMatches)) throw notFound;

  return order;
}

export async function getOrderForViewer(
  orderNumber: string,
  viewer?: { id: string; role: string },
  email?: string
) {
  return toOrderView(await findOrderForViewer(orderNumber, viewer, email));
}