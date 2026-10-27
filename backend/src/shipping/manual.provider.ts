import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { TtlCache } from "../lib/ttlCache";
import { manualConfigSchema, type ManualConfig, type ManualRule } from "./manual.config";
import { findDistrict, islandOf, searchDistricts, type Island } from "./regions";
import type { ShippingPoint, ShippingProvider, ShippingRate } from "./types";

const configCache = new TtlCache<ManualConfig>(30_000, 1);

export function clearManualConfigCache() {
  configCache.clear();
}

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

interface Place {
  regency: string;
  province: string;
  island?: Island;
}

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

function placeOf(point: ShippingPoint): Place | null {
  const district = findDistrict(point.areaId);
  if (!district) return null;
  return {
    regency: district.regency,
    province: district.province,
    island: islandOf(district.provinceId),
  };
}

// Urutan: kota, provinsi, pulau, lalu "default". Di tiap tingkat, aturan relatif (terhadap gudang)
// didahulukan dari aturan yang menyebut nama tertentu.
function pickRule(rules: ManualRule[], dest: Place | null, origin: Place | null): ManualRule | null {
  if (dest) {
    const find = (scope: ManualRule["scope"], test?: (r: ManualRule) => boolean) =>
      rules.find((r) => r.scope === scope && (!test || test(r)));

    const sameCity = Boolean(origin) && norm(origin?.regency) !== "" && norm(origin?.regency) === norm(dest.regency);
    const sameProvince =
      Boolean(origin) && norm(origin?.province) !== "" && norm(origin?.province) === norm(dest.province);
    const sameIsland = origin?.island !== undefined && origin.island === dest.island;

    const candidates: (ManualRule | undefined)[] = [
      sameCity ? find("same_city") : undefined,
      find("city", (r) => norm(r.value) === norm(dest.regency)),
      sameProvince ? find("same_province") : undefined,
      find("province", (r) => norm(r.value) === norm(dest.province)),
      sameIsland ? find("same_island") : undefined,
      dest.island ? find("island", (r) => norm(r.value) === dest.island) : undefined,
    ];

    const hit = candidates.find((c) => c !== undefined);
    if (hit) return hit;
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

  async getRates({ origin, destination, weightGram }) {
    const config = await loadConfig();

    // Tujuan atau gudang yang tidak dikenal: hanya aturan "default" yang berlaku
    const dest = placeOf(destination);
    const orig = placeOf(origin);

    const kg = Math.max(1, Math.ceil(weightGram / 1000));
    const rates: ShippingRate[] = [];

    for (const service of config.services) {
      if (service.maxWeightGram && weightGram > service.maxWeightGram) continue;

      const rule = pickRule(service.rules, dest, orig);
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
        zone: rule.scope,
      });
    }
    return rates;
  },
};