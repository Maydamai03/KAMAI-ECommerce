import { z } from "zod";

const ruleSchema = z.object({
  scope: z.enum(["city", "province", "island", "default"]),
  // city: nama kabupaten/kota (mis. "Kota Surabaya"); province: nama provinsi;
  // island: sumatera | jawa | nusa | kalimantan | sulawesi | timur; default: tanpa value
  value: z.string().trim().optional(),
  firstKg: z.number().int().min(0), // harga untuk 1 kg pertama
  nextKg: z.number().int().min(0), // harga tiap kg berikutnya
  etdMin: z.number().int().min(0),
  etdMax: z.number().int().min(0),
});

const serviceSchema = z.object({
  courierCode: z.string().min(1),
  courierName: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  description: z.string().default(""),
  maxWeightGram: z.number().int().positive().optional(),
  rules: z.array(ruleSchema).min(1),
});

export const manualConfigSchema = z.object({
  services: z.array(serviceSchema).min(1),
});

export type ManualRule = z.infer<typeof ruleSchema>;
export type ManualService = z.infer<typeof serviceSchema>;
export type ManualConfig = z.infer<typeof manualConfigSchema>;

/* ------------------------------------------------------------------ */
/* Tarif bawaan (CONTOH, bukan tarif kurir sesungguhnya)                */
/* Asal pengiriman diasumsikan Kota Surabaya.                           */
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
  { scope: "city", value: "Kota Surabaya", f: 1, etd: [1, 2], expressEtd: [1, 1], expressOk: true },
  { scope: "province", value: "Jawa Timur", f: 1.4, etd: [2, 3], expressEtd: [1, 2], expressOk: true },
  { scope: "island", value: "jawa", f: 2, etd: [2, 4], expressEtd: [1, 2], expressOk: true },
  { scope: "island", value: "sumatera", f: 3, etd: [3, 6], expressOk: false },
  { scope: "island", value: "kalimantan", f: 3, etd: [3, 6], expressOk: false },
  { scope: "island", value: "sulawesi", f: 3, etd: [3, 6], expressOk: false },
  { scope: "island", value: "nusa", f: 3, etd: [3, 6], expressOk: false },
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