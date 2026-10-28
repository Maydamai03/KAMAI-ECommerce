import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { shippingConfig } from "../config/shipping";
import { buildDefaultManualConfig, manualConfigSchema, type ManualConfig } from "../shipping/manual.config";
import { clearManualConfigCache, manualProvider } from "../shipping/manual.provider";
import { findDistrict } from "../shipping/regions";
import { blankToUndefined } from "../lib/slug";
import { clearShippingCaches, getShippingOrigin } from "./shipping.service";
import { getLogoUrl, getStoreProfile, optionalPhone, saveStoreProfile, profileSchema } from "./store-settings.service";
export { profileSchema, manualConfigSchema };

/* Alamat gudang */

export const originSchema = z.object({
  name: z.string().trim().min(2, "Nama gudang minimal 2 karakter").max(100),
  areaId: z.string().trim().min(1, "Pilih area gudang dari hasil pencarian").max(100),
  province: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Kode pos harus 5 digit"),
  address: z.string().trim().min(5, "Alamat minimal 5 karakter").max(300),
  phone: optionalPhone,
});

export type OriginInput = z.infer<typeof originSchema>;

export const previewSchema = z.object({
  areaId: z.string().trim().max(100).optional(),
  postalCode: z.preprocess(blankToUndefined, z.string().regex(/^\d{5}$/).optional()),
  weightGram: z.number().int().min(1).max(100_000),
});

function isKnownArea(areaId: string): boolean {
  try {
    return Boolean(findDistrict(areaId));
  } catch {
    return false;
  }
}

export async function getAdminSettings() {
    const [profile, logoUrl, originRow, manualRow] = await Promise.all([
    getStoreProfile(),
    getLogoUrl(),
    prisma.storeSetting.findUnique({ where: { key: "shipping_origin" } }),
    prisma.storeSetting.findUnique({ where: { key: "shipping_manual" } }),
  ]);

  const origin = (originRow?.value ?? null) as unknown as (OriginInput & { areaId?: string }) | null;

  let originProblem: string | null = null;
  if (!origin?.areaId) {
    originProblem = "Alamat gudang belum diatur.";
  } else if (shippingConfig.provider === "manual" && !isKnownArea(origin.areaId)) {
    originProblem =
      "Area gudang belum dikenali oleh penyedia tarif manual (kemungkinan data contoh). Cari dan pilih ulang area gudang, lalu simpan.";
  }

  let manual: ManualConfig | null = null;
  let manualError: string | null = null;
  if (!manualRow) {
    manualError = "Tarif belum diatur. Gunakan tombol reset untuk memulai dari tarif contoh.";
  } else {
    const parsed = manualConfigSchema.safeParse(manualRow.value);
    if (parsed.success) manual = parsed.data;
    else {
      manualError =
        "Konfigurasi tarif yang tersimpan tidak valid. Gunakan tombol reset untuk memulai dari tarif contoh.";
    }
  }

  return { provider: shippingConfig.provider, profile, logoUrl, origin, originProblem, manual, manualError };
}

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  return saveStoreProfile(input);
}

export async function updateOrigin(input: OriginInput) {
  if (shippingConfig.provider === "manual" && !isKnownArea(input.areaId)) {
    throw new AppError(400, "AREA_UNKNOWN", "Area gudang tidak dikenali. Cari dan pilih dari hasil pencarian.");
  }

  const value = JSON.parse(JSON.stringify(input));
  await prisma.storeSetting.upsert({
    where: { key: "shipping_origin" },
    update: { value },
    create: { key: "shipping_origin", value },
  });
  clearShippingCaches();
  return input;
}

async function writeManualConfig(config: ManualConfig) {
  const value = JSON.parse(JSON.stringify(config));
  await prisma.storeSetting.upsert({
    where: { key: "shipping_manual" },
    update: { value },
    create: { key: "shipping_manual", value },
  });
  clearManualConfigCache();
  clearShippingCaches();
  return config;
}

export const updateManualRates = (config: ManualConfig) => writeManualConfig(config);
export const resetManualRates = () => writeManualConfig(buildDefaultManualConfig());

export async function previewManualRates(input: z.infer<typeof previewSchema>) {
  const origin = await getShippingOrigin();
  const rates = await manualProvider.getRates({
    origin,
    destination: { areaId: input.areaId, postalCode: input.postalCode ?? "00000" },
    weightGram: input.weightGram,
  });
  return [...rates].sort((a, b) => a.price - b.price);
}