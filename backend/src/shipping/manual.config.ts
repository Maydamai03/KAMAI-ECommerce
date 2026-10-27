import { z } from "zod";

export const ISLANDS = ["sumatera", "jawa", "nusa", "kalimantan", "sulawesi", "timur"] as const;

const needsValue = (scope: string) => scope === "city" || scope === "province" || scope === "island";

const ruleSchema = z
  .object({
    scope: z.enum(["same_city", "same_province", "same_island", "city", "province", "island", "default"]),
    // city: nama kabupaten/kota; province: nama provinsi; island: salah satu dari ISLANDS
    value: z.string().trim().max(80).optional(),
    firstKg: z.number().int().min(0).max(100_000_000), // harga 1 kg pertama
    nextKg: z.number().int().min(0).max(100_000_000), // harga tiap kg berikutnya
    etdMin: z.number().int().min(0).max(60),
    etdMax: z.number().int().min(0).max(60),
  })
  .superRefine((r, ctx) => {
    if (needsValue(r.scope) && !r.value) {
      ctx.addIssue({ code: "custom", message: "Nilai zona wajib diisi", path: ["value"] });
    }
    if (r.scope === "island" && r.value && !(ISLANDS as readonly string[]).includes(r.value)) {
      ctx.addIssue({ code: "custom", message: "Pulau tidak dikenal", path: ["value"] });
    }
    if (r.etdMax < r.etdMin) {
      ctx.addIssue({ code: "custom", message: "Estimasi maksimum tidak boleh lebih kecil dari minimum", path: ["etdMax"] });
    }
  });

const serviceSchema = z
  .object({
    courierCode: z.string().min(1).max(30).regex(/^[a-z0-9][a-z0-9_-]*$/, "Kode kurir tidak valid"),
    courierName: z.string().trim().min(1, "Nama kurir wajib diisi").max(40),
    serviceCode: z.string().min(1).max(40).regex(/^[a-z0-9][a-z0-9_-]*$/, "Kode layanan tidak valid"),
    serviceName: z.string().trim().min(1, "Nama layanan wajib diisi").max(40),
    description: z.string().trim().max(120).default(""),
    maxWeightGram: z.number().int().positive().max(1_000_000).optional(),
    rules: z.array(ruleSchema).min(1, "Setiap layanan membutuhkan minimal satu zona").max(12),
  })
  .superRefine((s, ctx) => {
    const seen = new Set<string>();
    s.rules.forEach((r, i) => {
      const sig = needsValue(r.scope) ? `${r.scope}|${(r.value ?? "").toLowerCase()}` : r.scope;
      if (seen.has(sig)) {
        ctx.addIssue({
          code: "custom",
          message: `Zona yang sama muncul lebih dari sekali pada ${s.courierName} ${s.serviceName}`,
          path: ["rules", i],
        });
      }
      seen.add(sig);
    });
  });

export const manualConfigSchema = z
  .object({
    services: z.array(serviceSchema).min(1, "Tambahkan minimal satu layanan").max(12),
  })
  .superRefine((c, ctx) => {
    const pairs = new Set<string>();
    c.services.forEach((s, i) => {
      const pair = `${s.courierCode}|${s.serviceCode}`;
      if (pairs.has(pair)) {
        ctx.addIssue({
          code: "custom",
          message: `Layanan ${s.courierName} ${s.serviceName} muncul lebih dari sekali`,
          path: ["services", i],
        });
      }
      pairs.add(pair);
    });
  });

export type ManualRule = z.infer<typeof ruleSchema>;
export type ManualService = z.infer<typeof serviceSchema>;
export type ManualConfig = z.infer<typeof manualConfigSchema>;

/* ------------------------------------------------------------------ */
/* Tarif bawaan (CONTOH, bukan tarif kurir sesungguhnya)                */
/* Zona relatif terhadap alamat gudang.                                 */
/* ------------------------------------------------------------------ */

const round500 = (n: number) => Math.round(n / 500) * 500;

const BASE_SERVICES = [
  { courierCode: "jne", courierName: "JNE", serviceCode: "reg", serviceName: "REG", description: "Layanan reguler", base: 9000, perKg: 4000, express: false },
  { courierCode: "jne", courierName: "JNE", serviceCode: "yes", serviceName: "YES", description: "Yakin esok sampai (satu pulau)", base: 20000, perKg: 9000, express: true },
  { courierCode: "jnt", courierName: "J&T", serviceCode: "ez", serviceName: "EZ", description: "Layanan reguler", base: 8500, perKg: 3500, express: false },
  { courierCode: "sicepat", courierName: "SiCepat", serviceCode: "reg", serviceName: "REG", description: "Layanan reguler", base: 8000, perKg: 3800, express: false },
  { courierCode: "sicepat", courierName: "SiCepat", serviceCode: "best", serviceName: "BEST", description: "Besok sampai tujuan (satu pulau)", base: 17000, perKg: 8000, express: true },
  { courierCode: "anteraja", courierName: "AnterAja", serviceCode: "reg", serviceName: "REG", description: "Layanan reguler", base: 8500, perKg: 3600, express: false },
];

interface Zone {
  scope: ManualRule["scope"];
  value?: string;
  f: number;
  etd: [number, number];
  expressEtd?: [number, number];
  expressOk: boolean;
}

const ZONES: Zone[] = [
  { scope: "same_city", f: 1, etd: [1, 2], expressEtd: [1, 1], expressOk: true },
  { scope: "same_province", f: 1.4, etd: [2, 3], expressEtd: [1, 2], expressOk: true },
  { scope: "same_island", f: 2, etd: [2, 4], expressEtd: [1, 2], expressOk: true },
  { scope: "island", value: "timur", f: 4.5, etd: [5, 9], expressOk: false },
  { scope: "default", f: 3, etd: [4, 7], expressOk: false },
];

export function buildDefaultManualConfig(): ManualConfig {
  return {
    services: BASE_SERVICES.map(({ base, perKg, express, ...service }) => ({
      ...service,
      // Layanan ekspres tidak punya aturan di luar zona yang dilayaninya, jadi tidak tersedia di sana
      rules: ZONES.filter((z) => !express || z.expressOk).map((z) => {
        const [etdMin, etdMax] = express && z.expressEtd ? z.expressEtd : z.etd;
        return {
          scope: z.scope,
          ...(z.value ? { value: z.value } : {}),
          firstKg: round500((base + perKg) * z.f),
          nextKg: round500(perKg * z.f),
          etdMin,
          etdMax,
        };
      }),
    })),
  };
}