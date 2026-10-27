import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { TtlCache } from "../lib/ttlCache";
import { getShippingProvider } from "../shipping";
import type { ShippingArea, ShippingPoint, ShippingRate } from "../shipping/types";
import { cartValidateSchema, validateCart } from "./cart.service";

export const areaQuerySchema = z.object({
  q: z.string().trim().min(3, "Ketik minimal 3 huruf").max(60),
});

export const ratesRequestSchema = cartValidateSchema.extend({
  areaId: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 digit"),
});

const areaCache = new TtlCache<ShippingArea[]>(60 * 60 * 1000);
const rateCache = new TtlCache<ShippingRate[]>(5 * 60 * 1000);

export async function getShippingOrigin(): Promise<ShippingPoint> {
  const row = await prisma.storeSetting.findUnique({ where: { key: "shipping_origin" } });
  const value = row?.value as unknown as { areaId?: string; postalCode?: string } | undefined;
  if (!value?.postalCode) {
    throw new AppError(500, "ORIGIN_NOT_SET", "Alamat asal pengiriman belum diatur");
  }
  return { areaId: value.areaId, postalCode: value.postalCode };
}

export async function searchAreas(q: string): Promise<ShippingArea[]> {
  const key = q.toLowerCase();
  const hit = areaCache.get(key);
  if (hit) return hit;

  const areas = await getShippingProvider().searchAreas(q);
  areaCache.set(key, areas);
  return areas;
}

async function fetchRates(
  destination: ShippingPoint,
  weightGram: number,
  fresh = false
): Promise<ShippingRate[]> {
  const origin = await getShippingOrigin();
  const key = [
    origin.areaId ?? origin.postalCode,
    destination.areaId ?? "",
    destination.postalCode,
    weightGram,
  ].join("|");

  if (!fresh) {
    const hit = rateCache.get(key);
    if (hit) return hit;
  }

  const rates = await getShippingProvider().getRates({ origin, destination, weightGram });
  const sorted = [...rates].sort((a, b) => a.price - b.price);
  rateCache.set(key, sorted);
  return sorted;
}

export async function getRatesForCart(input: z.infer<typeof ratesRequestSchema>) {
  const cart = await validateCart({ items: input.items });
  if (!cart.valid) {
    throw new AppError(
      409,
      "CART_INVALID",
      "Beberapa item tidak tersedia atau stoknya berkurang.",
      cart.lines
        .filter((l) => l.issue !== null)
        .map((l) => ({ variantId: l.variantId, issue: l.issue }))
    );
  }

  const rates = await fetchRates(
    { areaId: input.areaId, postalCode: input.postalCode },
    cart.totalWeightGram
  );
  return { weightGram: cart.totalWeightGram, rates };
}

/** Dipakai saat membuat pesanan: selalu menghitung ulang, tidak memakai cache */
export async function resolveShippingRate(
  choice: { courierCode: string; serviceCode: string },
  destination: ShippingPoint,
  weightGram: number
): Promise<ShippingRate> {
  const rates = await fetchRates(destination, weightGram, true);
  const match = rates.find(
    (r) => r.courierCode === choice.courierCode && r.serviceCode === choice.serviceCode
  );
  if (!match) {
    throw new AppError(
      409,
      "SHIPPING_UNAVAILABLE",
      "Layanan pengiriman yang dipilih tidak tersedia. Silakan pilih kurir lagi."
    );
  }
  return match;
}

export function clearShippingCaches() {
  rateCache.clear();
}