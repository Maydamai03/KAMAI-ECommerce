import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

export const listQuerySchema = z.object({
  category: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().optional(),
  featured: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export async function listProducts(q: ListQuery) {
  const hasPrice = q.minPrice !== undefined || q.maxPrice !== undefined;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    ...(q.category ? { category: { slug: q.category } } : {}),
    ...(q.q ? { name: { contains: q.q, mode: "insensitive" } } : {}),
    ...(q.featured ? { isFeatured: q.featured === "true" } : {}),
    ...(hasPrice ? { basePrice: { gte: q.minPrice, lte: q.maxPrice } } : {}),
    ...(q.size || q.color
      ? {
          variants: {
            some: {
              isActive: true,
              ...(q.size ? { size: q.size } : {}),
              ...(q.color ? { color: q.color } : {}),
            },
          },
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === "price_asc"
      ? { basePrice: "asc" }
      : q.sort === "price_desc"
        ? { basePrice: "desc" }
        : { createdAt: "desc" };

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { position: "asc" }, take: 2 },
        variants: { where: { isActive: true }, select: { stock: true } },
      },
    }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.basePrice,
    isFeatured: p.isFeatured,
    category: p.category,
    image: p.images[0]?.url ?? null,
    hoverImage: p.images[1]?.url ?? null,
    inStock: p.variants.some((v) => v.stock > 0),
  }));

  return {
    items,
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    },
  };
}

export async function getProductBySlug(slug: string) {
  const p = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { position: "asc" } },
      variants: {
        where: { isActive: true },
        orderBy: [{ color: "asc" }, { size: "asc" }],
      },
    },
  });

  if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.basePrice,
    weightGram: p.weightGram,
    category: p.category,
    images: p.images.map((i) => ({ id: i.id, url: i.url, isPrimary: i.isPrimary })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      stock: v.stock,
      price: v.priceOverride ?? p.basePrice,
    })),
  };
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export async function getFilterOptions() {
  const activeProduct = { isActive: true, deletedAt: null };

  const [variants, price] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: activeProduct },
      distinct: ["size", "color"],
      select: { size: true, color: true },
    }),
    prisma.product.aggregate({
      where: activeProduct,
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const colors = [...new Set(variants.map((v) => v.color))].sort();

  return {
    sizes,
    colors,
    minPrice: price._min.basePrice ?? 0,
    maxPrice: price._max.basePrice ?? 0,
  };
}