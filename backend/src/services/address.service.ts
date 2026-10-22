import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

const MAX_ADDRESSES = 10;

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2, "Nama penerima minimal 2 karakter").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid"),
  province: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 digit"),
  areaId: z.string().trim().max(100).optional(),
  street: z.string().trim().min(5, "Alamat minimal 5 karakter").max(300),
  note: z.string().trim().max(200).optional(),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(userId: string, input: AddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    throw new AppError(400, "ADDRESS_LIMIT", `Maksimal ${MAX_ADDRESSES} alamat tersimpan`);
  }

  // Alamat pertama otomatis menjadi alamat utama
  const makeDefault = count === 0 || input.isDefault === true;
  const { isDefault: _ignored, note, ...rest } = input;

  return prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: { userId, ...rest, note: note || null, isDefault: makeDefault },
    });
  });
}

export async function updateAddress(userId: string, id: string, input: AddressInput) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "ADDRESS_NOT_FOUND", "Alamat tidak ditemukan");

  // Alamat utama tidak bisa "dicopot" langsung; pilih alamat lain sebagai utama
  const makeDefault = existing.isDefault || input.isDefault === true;
  const { isDefault: _ignored, note, ...rest } = input;

  return prisma.$transaction(async (tx) => {
    if (makeDefault && !existing.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id },
      data: { ...rest, note: note || null, isDefault: makeDefault },
    });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError(404, "ADDRESS_NOT_FOUND", "Alamat tidak ditemukan");

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });

    // Kalau yang dihapus adalah alamat utama, jadikan alamat terbaru sebagai utama
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });
}