import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { TtlCache } from "../lib/ttlCache";
import { manualConfigSchema, type ManualConfig, type ManualRule } from "./manual.config";
import { findDistrict, islandOf, searchDistricts, type Island } from "./regions";
import type { ShippingProvider, ShippingRate } from "./types";

const configCache = new TtlCache<ManualConfig>(30_000, 1);

async function loadConfig(): Promise<ManualConfig> {
  const hit = configCache.get("config");
  if (hit) return hit;

  const row = await prisma.storeSetting.findUnique({ where: { key: "shipping_manual" } });
  if (!row) {
    throw new AppError(500, "MANUAL_RATES_NOT_SET", "Tarif pengiriman manual belum diatur");
  }

  const parsed = manualConfigSchema.safeParse(row.value);
  if (!parsed.success) {
    console.error("[shipping] konfigurasi tarif manual tidak valid:", parsed.error.issues);
    throw new AppError(500, "MANUAL_RATES_INVALID", "Konfigurasi tarif pengiriman tidak valid");
  }

  configCache.set("config", parsed.data);
  return parsed.data;
}

interface Destination {
  regency: string;
  province: string;
  island?: Island;
}

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

// Aturan paling spesifik menang: kota > provinsi > pulau > bawaan
function pickRule(rules: ManualRule[], dest: Destination | null): ManualRule | null {
  if (dest) {
    const city = rules.find((r) => r.scope === "city" && norm(r.value) === norm(dest.regency));
    if (city) return city;
    const province = rules.find((r) => r.scope === "province" && norm(r.value) === norm(dest.province));
    if (province) return province;
    const island = rules.find((r) => r.scope === "island" && dest.island && norm(r.value) === dest.island);
    if (island) return island;
  }
  return rules.find((r) => r.scope === "default") ?? null;
}

export const manualProvider: ShippingProvider = {
  name: "manual",

  async searchAreas(query) {
    return searchDistricts(query).map((d) => ({
      id: d.areaId,
      label: d.label,
      province: d.province,
      city: d.regency,
      district: d.name,
      postalCode: "", // data wilayah tidak memuat kode pos; pembeli mengisinya sendiri
    }));
  },

  async getRates({ destination, weightGram }) {
    const config = await loadConfig();

    const district = findDistrict(destination.areaId);
    const dest: Destination | null = district
      ? {
          regency: district.regency,
          province: district.province,
          island: islandOf(district.provinceId),
        }
      : null; // alamat tanpa area dikenal: hanya aturan "default" yang berlaku

    const kg = Math.max(1, Math.ceil(weightGram / 1000));
    const rates: ShippingRate[] = [];

    for (const service of config.services) {
      if (service.maxWeightGram && weightGram > service.maxWeightGram) continue;

      const rule = pickRule(service.rules, dest);
      if (!rule) continue; // tidak ada aturan yang cocok: layanan tidak tersedia di tujuan ini

      rates.push({
        courierCode: service.courierCode,
        courierName: service.courierName,
        serviceCode: service.serviceCode,
        serviceName: service.serviceName,
        description: service.description,
        price: rule.firstKg + (kg - 1) * rule.nextKg,
        etdMinDays: rule.etdMin,
        etdMaxDays: Math.max(rule.etdMin, rule.etdMax),
      });
    }
    return rates;
  },
};