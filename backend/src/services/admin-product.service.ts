import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError, isUniqueViolation } from "../lib/errors";
import { SLUG_REGEX, blankToUndefined, slugify, uniqueSlug } from "../lib/slug";

type Tx = Prisma.TransactionClient;

/* ------------------------------------------------------------------ */
/* Skema                                                               */
/* ------------------------------------------------------------------ */

const optionalSlug = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(SLUG_REGEX, "Slug hanya boleh huruf kecil, angka, dan tanda hubung")
    .optional()
);

const optionalSku = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .toUpperCase()
    .max(80)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/, "SKU hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung")
    .optional()
);

const variantSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  color: z.string().trim().min(1, "Warna wajib diisi").max(40),
  size: z.string().trim().min(1, "Ukuran wajib diisi").max(20),
  sku: optionalSku,
  stock: z.number().int("Stok harus bilangan bulat").min(0, "Stok tidak boleh negatif").max(100000),
  // Stok saat halaman dimuat; wajib untuk varian yang sudah ada (pengaman edit bersamaan)
  expectedStock: z.number().int().min(0).optional(),
  priceOverride: z.number().int().min(1, "Harga khusus minimal 1").max(1_000_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Nama produk minimal 2 karakter").max(120),
    slug: optionalSlug,
    description: z.string().trim().min(1, "Deskripsi wajib diisi").max(5000),
    categoryId: z.string().min(1, "Pilih kategori").max(100),
    basePrice: z.number().int("Harga harus bilangan bulat").min(1, "Harga minimal 1").max(1_000_000_000),
    weightGram: z.number().int("Berat harus bilangan bulat").min(1, "Berat minimal 1 gram").max(100_000),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    variants: z.array(variantSchema).max(100),
  })
  .superRefine((p, ctx) => {
    if (p.isActive && p.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Produk aktif membutuhkan minimal satu varian",
        path: ["variants"],
      });
    }

    const combos = new Set<string>();
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      const key = `${v.color.toLowerCase()}|${v.size.toLowerCase()}`;
      if (combos.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `Varian ${v.color} / ${v.size} muncul lebih dari sekali`,
          path: ["variants", i],
        });
      }
      combos.add(key);

      if (v.sku) {
        if (skus.has(v.sku)) {
          ctx.addIssue({ code: "custom", message: `SKU ${v.sku} dipakai dua varian`, path: ["variants", i, "sku"] });
        }
        skus.add(v.sku);
      }

      if (v.id && v.expectedStock === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "expectedStock wajib untuk varian yang sudah ada",
          path: ["variants", i, "expectedStock"],
        });
      }
    });
  });

export type ProductInput = z.infer<typeof productSchema>;

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const flagsSchema = z
  .object({ isActive: z.boolean().optional(), isFeatured: z.boolean().optional() })
  .refine((f) => f.isActive !== undefined || f.isFeatured !== undefined, {
    message: "Tidak ada perubahan",
  });

/* ------------------------------------------------------------------ */
/* Pembaca                                                             */
/* ------------------------------------------------------------------ */

const detailInclude = {
  category: { select: { id: true, name: true } },
  images: { orderBy: { position: "asc" } },
  variants: {
    orderBy: [{ color: "asc" }, { size: "asc" }],
    include: { _count: { select: { orderItems: true } } },
  },
} satisfies Prisma.ProductInclude;

type DetailRecord = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

function toDetail(p: DetailRecord) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
    category: p.category,
    basePrice: p.basePrice,
    weightGram: p.weightGram,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    images: p.images.map((i) => ({ id: i.id, url: i.url, isPrimary: i.isPrimary })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      stock: v.stock,
      priceOverride: v.priceOverride,
      isActive: v.isActive,
      orderCount: v._count.orderItems,
    })),
  };
}

export async function getAdminProduct(id: string) {
  const p = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: detailInclude,
  });
  if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");
  return toDetail(p);
}

export async function listAdminProducts(q: z.infer<typeof adminListQuerySchema>) {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(q.status === "active" ? { isActive: true } : q.status === "inactive" ? { isActive: false } : {}),
    ...(q.category ? { categoryId: q.category } : {}),
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: "insensitive" } },
            { slug: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { select: { stock: true, isActive: true } },
      },
    }),
  ]);

  return {
    items: rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      basePrice: p.basePrice,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      image: p.images[0]?.url ?? null,
      variantCount: p.variants.length,
      totalStock: p.variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0),
    })),
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Pembantu                                                            */
/* ------------------------------------------------------------------ */

const autoSku = (slug: string, color: string, size: string) =>
  `${slug}-${slugify(color)}-${slugify(size)}`.toUpperCase().slice(0, 80);

async function assertSkusFree(tx: Tx, skus: string[], ownVariantIds: string[] = []) {
  if (skus.length === 0) return;
  const taken = await tx.productVariant.findMany({
    where: { sku: { in: skus }, id: { notIn: ownVariantIds } },
    select: { sku: true },
  });
  if (taken.length > 0) {
    throw new AppError(
      409,
      "SKU_TAKEN",
      `SKU sudah dipakai varian lain: ${taken.map((t) => t.sku).join(", ")}. Isi SKU secara manual.`
    );
  }
}

async function assertCategory(tx: Tx, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw new AppError(400, "CATEGORY_NOT_FOUND", "Kategori tidak ditemukan");
}

const duplicateError = () =>
  new AppError(
    409,
    "DUPLICATE",
    "Slug, SKU, atau kombinasi warna/ukuran bentrok dengan data lain. Periksa kembali isiannya."
  );

/* ------------------------------------------------------------------ */
/* Tambah                                                              */
/* ------------------------------------------------------------------ */

export async function createAdminProduct(input: ProductInput) {
  try {
    const id = await prisma.$transaction(
      async (tx) => {
        await assertCategory(tx, input.categoryId);

        const slugTaken = async (s: string) =>
          Boolean(await tx.product.findUnique({ where: { slug: s }, select: { id: true } }));

        let slug: string;
        if (input.slug) {
          if (await slugTaken(input.slug)) {
            throw new AppError(409, "SLUG_TAKEN", "Slug sudah dipakai produk lain");
          }
          slug = input.slug;
        } else {
          const base = slugify(input.name);
          if (!base) {
            throw new AppError(400, "INVALID_SLUG", "Slug tidak dapat dibuat dari nama ini. Isi slug secara manual.");
          }
          slug = await uniqueSlug(base, slugTaken);
        }

        const variants = input.variants.map((v) => ({ ...v, sku: v.sku ?? autoSku(slug, v.color, v.size) }));
        await assertSkusFree(tx, variants.map((v) => v.sku));

        const created = await tx.product.create({
          data: {
            name: input.name,
            slug,
            description: input.description,
            categoryId: input.categoryId,
            basePrice: input.basePrice,
            weightGram: input.weightGram,
            isActive: input.isActive,
            isFeatured: input.isFeatured,
            variants: {
              create: variants.map((v) => ({
                sku: v.sku,
                color: v.color,
                size: v.size,
                stock: v.stock,
                priceOverride: v.priceOverride ?? null,
                isActive: v.isActive,
              })),
            },
          },
          select: { id: true },
        });
        return created.id;
      },
      { timeout: 15_000 }
    );

    return { product: await getAdminProduct(id), warnings: [] as string[] };
  } catch (e) {
    if (isUniqueViolation(e)) throw duplicateError();
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Ubah (sinkronisasi varian)                                          */
/* ------------------------------------------------------------------ */

export async function updateAdminProduct(id: string, input: ProductInput) {
  const warnings: string[] = [];

  try {
    await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findFirst({
          where: { id, deletedAt: null },
          include: { variants: { include: { _count: { select: { orderItems: true } } } } },
        });
        if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");

        await assertCategory(tx, input.categoryId);

        let slug = product.slug;
        if (input.slug && input.slug !== product.slug) {
          const other = await tx.product.findUnique({ where: { slug: input.slug }, select: { id: true } });
          if (other && other.id !== id) throw new AppError(409, "SLUG_TAKEN", "Slug sudah dipakai produk lain");
          slug = input.slug;
        }

        const existingById = new Map(product.variants.map((v) => [v.id, v]));
        for (const v of input.variants) {
          if (v.id && !existingById.has(v.id)) {
            throw new AppError(400, "VARIANT_NOT_FOUND", "Varian tidak ditemukan pada produk ini");
          }
        }

        await tx.product.update({
          where: { id },
          data: {
            name: input.name,
            slug,
            description: input.description,
            categoryId: input.categoryId,
            basePrice: input.basePrice,
            weightGram: input.weightGram,
            isActive: input.isActive,
            isFeatured: input.isFeatured,
          },
        });

        // 1. Varian yang dihapus dari form: dihapus bila belum pernah dipesan, kalau sudah hanya dinonaktifkan
        const keepIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id as string));
        const retainedCombos = new Set<string>();
        let deactivated = 0;

        for (const old of product.variants) {
          if (keepIds.has(old.id)) continue;
          if (old._count.orderItems > 0) {
            if (old.isActive) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
            retainedCombos.add(`${old.color.toLowerCase()}|${old.size.toLowerCase()}`);
            deactivated++;
          } else {
            await tx.productVariant.delete({ where: { id: old.id } });
          }
        }

        for (const v of input.variants) {
          const key = `${v.color.toLowerCase()}|${v.size.toLowerCase()}`;
          if (retainedCombos.has(key)) {
            throw new AppError(
              409,
              "VARIANT_EXISTS",
              `Varian ${v.color} / ${v.size} pernah dipesan sehingga hanya dinonaktifkan. Aktifkan kembali varian lama itu (jangan menghapusnya) alih-alih membuat yang baru.`
            );
          }
        }

        // 2. SKU: yang tidak diisi memakai SKU lama (varian lama) atau dibuat otomatis (varian baru)
        const resolved = input.variants.map((v) => ({
          ...v,
          sku: v.sku ?? (v.id ? (existingById.get(v.id)?.sku as string) : autoSku(slug, v.color, v.size)),
        }));
        await assertSkusFree(
          tx,
          resolved.map((v) => v.sku),
          product.variants.map((v) => v.id)
        );

        // 3. Perbarui varian yang sudah ada
        for (const v of resolved.filter((x) => x.id)) {
          await tx.productVariant.update({
            where: { id: v.id as string },
            data: {
              color: v.color,
              size: v.size,
              sku: v.sku,
              priceOverride: v.priceOverride ?? null,
              isActive: v.isActive,
            },
          });

          // Stok hanya disentuh bila admin mengubahnya, dan hanya bila belum berubah oleh pesanan
          if (v.expectedStock !== undefined && v.stock !== v.expectedStock) {
            const result = await tx.productVariant.updateMany({
              where: { id: v.id as string, stock: v.expectedStock },
              data: { stock: v.stock },
            });
            if (result.count === 0) {
              throw new AppError(
                409,
                "STOCK_CHANGED",
                `Stok ${v.color} / ${v.size} berubah sejak halaman dibuka (mungkin ada pesanan baru). Muat ulang halaman lalu ubah lagi.`,
                { variantId: v.id }
              );
            }
          }
        }

        // 4. Tambah varian baru
        for (const v of resolved.filter((x) => !x.id)) {
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              color: v.color,
              size: v.size,
              stock: v.stock,
              priceOverride: v.priceOverride ?? null,
              isActive: v.isActive,
            },
          });
        }

        if (deactivated > 0) {
          warnings.push(
            `${deactivated} varian sudah pernah dipesan sehingga hanya dinonaktifkan, tidak dihapus.`
          );
        }
      },
      { timeout: 15_000 }
    );
  } catch (e) {
    if (isUniqueViolation(e)) throw duplicateError();
    throw e;
  }

  return { product: await getAdminProduct(id), warnings };
}

/* ------------------------------------------------------------------ */
/* Tandai dan hapus                                                    */
/* ------------------------------------------------------------------ */

export async function setProductFlags(id: string, flags: z.infer<typeof flagsSchema>) {
  const exists = await prisma.product.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!exists) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");
  await prisma.product.update({ where: { id }, data: flags });
}

/** Hapus lunak: riwayat pesanan tetap aman, slug dibebaskan */
export async function deleteAdminProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      isFeatured: false,
      slug: `${product.slug}-del-${Date.now().toString(36)}`,
    },
  });
}