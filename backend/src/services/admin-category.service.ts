import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError, isUniqueViolation } from "../lib/errors";
import { SLUG_REGEX, blankToUndefined, slugify, uniqueSlug } from "../lib/slug";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(60),
  slug: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .max(80)
      .regex(SLUG_REGEX, "Slug hanya boleh huruf kecil, angka, dan tanda hubung")
      .optional()
  ),
});

export type CategoryInput = z.infer<typeof categorySchema>;

const slugTaken = async (slug: string, exceptId?: string) => {
  const found = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(found && found.id !== exceptId);
};

export async function listAdminCategories() {
  const rows = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count.products,
  }));
}

export async function createAdminCategory(input: CategoryInput) {
  let slug: string;
  if (input.slug) {
    if (await slugTaken(input.slug)) {
      throw new AppError(409, "SLUG_TAKEN", "Slug sudah dipakai kategori lain");
    }
    slug = input.slug;
  } else {
    const base = slugify(input.name);
    if (!base) {
      throw new AppError(400, "INVALID_SLUG", "Slug tidak dapat dibuat dari nama ini. Isi slug secara manual.");
    }
    slug = await uniqueSlug(base, (s) => slugTaken(s));
  }

  try {
    const c = await prisma.category.create({ data: { name: input.name, slug } });
    return { id: c.id, name: c.name, slug: c.slug, productCount: 0 };
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(409, "SLUG_TAKEN", "Slug sudah dipakai kategori lain");
    throw e;
  }
}

export async function updateAdminCategory(id: string, input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "CATEGORY_NOT_FOUND", "Kategori tidak ditemukan");

  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    if (await slugTaken(input.slug, id)) {
      throw new AppError(409, "SLUG_TAKEN", "Slug sudah dipakai kategori lain");
    }
    slug = input.slug;
  }

  try {
    const c = await prisma.category.update({ where: { id }, data: { name: input.name, slug } });
    const productCount = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
    return { id: c.id, name: c.name, slug: c.slug, productCount };
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(409, "SLUG_TAKEN", "Slug sudah dipakai kategori lain");
    throw e;
  }
}

export async function deleteAdminCategory(id: string) {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError(404, "CATEGORY_NOT_FOUND", "Kategori tidak ditemukan");

  const [products, children] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }), // termasuk produk yang sudah dihapus
    prisma.category.count({ where: { parentId: id } }),
  ]);

  if (products > 0) {
    throw new AppError(
      409,
      "CATEGORY_IN_USE",
      `Kategori masih dipakai ${products} produk (termasuk produk yang sudah dihapus). Pindahkan produknya ke kategori lain dulu.`
    );
  }
  if (children > 0) {
    throw new AppError(409, "CATEGORY_IN_USE", "Kategori masih memiliki sub-kategori.");
  }

  await prisma.category.delete({ where: { id } });
}