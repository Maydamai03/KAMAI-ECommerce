import { z } from "zod";
import { prisma } from "../lib/prisma";

export const cartValidateSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .max(50),
});

export type CartIssue = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK";

export async function validateCart(input: z.infer<typeof cartValidateSchema>) {
  // Gabungkan item dengan variantId yang sama
  const merged = new Map<string, number>();
  for (const item of input.items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }

  const ids = [...merged.keys()];
  const variants = ids.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: ids } },
        include: {
          product: {
            include: { images: { orderBy: { position: "asc" }, take: 1 } },
          },
        },
      })
    : [];
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines = ids.map((variantId) => {
    const quantity = merged.get(variantId) ?? 0;
    const v = byId.get(variantId);

    if (!v || !v.isActive || !v.product.isActive || v.product.deletedAt) {
      return {
        available: false as const,
        variantId,
        quantity,
        issue: "UNAVAILABLE" as CartIssue,
      };
    }

    const issue: CartIssue | null =
      v.stock === 0 ? "OUT_OF_STOCK" : quantity > v.stock ? "INSUFFICIENT_STOCK" : null;

    return {
      available: true as const,
      variantId,
      quantity,
      issue,
      productId: v.productId,
      slug: v.product.slug,
      name: v.product.name,
      color: v.color,
      size: v.size,
      image: v.product.images[0]?.url ?? null,
      unitPrice: v.priceOverride ?? v.product.basePrice,
      weightGram: v.product.weightGram,
      stock: v.stock,
    };
  });

  let subtotal = 0;
  let totalWeightGram = 0;
  for (const line of lines) {
    if (line.available && line.issue === null) {
      subtotal += line.unitPrice * line.quantity;
      totalWeightGram += line.weightGram * line.quantity;
    }
  }

  return {
    lines,
    subtotal,
    totalWeightGram,
    valid: lines.length > 0 && lines.every((l) => l.available && l.issue === null),
  };
}