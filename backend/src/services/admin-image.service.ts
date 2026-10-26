import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { detectImageType } from "../lib/imageType";
import { storageConfig } from "../config/storage";
import { getStorage, removeStoredImage } from "../storage";
import type { StoredImage } from "../storage/types";

type Tx = Prisma.TransactionClient;

const MAX = storageConfig.maxImagesPerProduct;

export const reorderSchema = z.object({
  imageIds: z.array(z.string().min(1).max(100)).min(1).max(MAX),
});

// Mengunci baris produk: operasi gambar pada produk yang sama dijalankan bergantian
async function lockProduct(tx: Tx, productId: string) {
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
}

async function assertProduct(productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");
}

export async function listProductImages(productId: string) {
  const rows = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: { id: true, url: true, isPrimary: true },
  });
  return rows;
}

export async function uploadProductImages(productId: string, files: Express.Multer.File[]) {
  if (files.length === 0) {
    throw new AppError(400, "NO_FILES", "Pilih minimal satu gambar.");
  }
  await assertProduct(productId);

  // 1. Periksa isi tiap berkas
  const prepared = files.map((file) => {
    const kind = detectImageType(file.buffer);
    if (!kind) {
      throw new AppError(
        400,
        "INVALID_IMAGE",
        `Berkas "${file.originalname}" bukan gambar JPEG, PNG, atau WebP yang valid.`
      );
    }
    return { file, kind };
  });

  // 2. Periksa batas jumlah sebelum mengunggah
  const existing = await prisma.productImage.count({ where: { productId } });
  if (existing + prepared.length > MAX) {
    throw new AppError(
      400,
      "IMAGE_LIMIT",
      `Maksimal ${MAX} gambar per produk (saat ini ada ${existing}).`
    );
  }

  // 3. Simpan berkas, lalu catat di database. Bila gagal, berkas dibersihkan lagi
  const storage = getStorage();
  const saved: StoredImage[] = [];

  try {
    for (const { file, kind } of prepared) {
      saved.push(await storage.save({ buffer: file.buffer, ext: kind.ext, mime: kind.mime }));
    }

    await prisma.$transaction(async (tx) => {
      await lockProduct(tx, productId);

      const current = await tx.productImage.findMany({
        where: { productId },
        select: { position: true },
        orderBy: { position: "desc" },
      });
      if (current.length + saved.length > MAX) {
        throw new AppError(400, "IMAGE_LIMIT", `Maksimal ${MAX} gambar per produk.`);
      }

      const start = current.length === 0 ? 0 : current[0].position + 1;
      await tx.productImage.createMany({
        data: saved.map((s, i) => ({
          productId,
          url: s.url,
          publicId: s.publicId,
          position: start + i,
          isPrimary: current.length === 0 && i === 0,
        })),
      });
    });
  } catch (e) {
    await Promise.all(saved.map((s) => removeStoredImage(s.publicId)));
    throw e;
  }

  return listProductImages(productId);
}

/** Mengatur urutan. Gambar pertama otomatis menjadi gambar utama */
export async function reorderProductImages(productId: string, imageIds: string[]) {
  await assertProduct(productId);

  await prisma.$transaction(async (tx) => {
    await lockProduct(tx, productId);

    const current = await tx.productImage.findMany({ where: { productId }, select: { id: true } });
    const have = new Set(current.map((i) => i.id));
    const sameSet =
      imageIds.length === have.size &&
      new Set(imageIds).size === imageIds.length &&
      imageIds.every((id) => have.has(id));

    if (!sameSet) {
      throw new AppError(
        409,
        "IMAGES_CHANGED",
        "Daftar gambar sudah berubah. Muat ulang halaman lalu coba lagi."
      );
    }

    for (let i = 0; i < imageIds.length; i++) {
      await tx.productImage.update({
        where: { id: imageIds[i] },
        data: { position: i, isPrimary: i === 0 },
      });
    }
  });

  return listProductImages(productId);
}

export async function deleteProductImage(productId: string, imageId: string) {
  await assertProduct(productId);

  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new AppError(404, "IMAGE_NOT_FOUND", "Gambar tidak ditemukan");

  await prisma.$transaction(async (tx) => {
    await lockProduct(tx, productId);

    const removed = await tx.productImage.deleteMany({ where: { id: imageId, productId } });
    if (removed.count === 0) return; // sudah dihapus proses lain

    // Rapikan urutan; gambar pertama yang tersisa menjadi gambar utama
    const rest = await tx.productImage.findMany({
      where: { productId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    for (let i = 0; i < rest.length; i++) {
      await tx.productImage.update({
        where: { id: rest[i].id },
        data: { position: i, isPrimary: i === 0 },
      });
    }
  });

  // Berkas dihapus setelah database berhasil diperbarui (gagal hapus berkas hanya dicatat)
  await removeStoredImage(image.publicId);

  return listProductImages(productId);
}