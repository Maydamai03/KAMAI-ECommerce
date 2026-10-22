import type { RateQuery, ShippingArea, ShippingProvider, ShippingRate } from "./types";

type Island = "jawa" | "sumatera" | "kalimantan" | "sulawesi" | "nusa" | "timur";

const ISLAND_BY_PROVINCE: Record<string, Island> = {
  "DKI Jakarta": "jawa",
  Banten: "jawa",
  "Jawa Barat": "jawa",
  "Jawa Tengah": "jawa",
  "DI Yogyakarta": "jawa",
  "Jawa Timur": "jawa",
  "Sumatera Utara": "sumatera",
  "Sumatera Barat": "sumatera",
  Riau: "sumatera",
  "Sumatera Selatan": "sumatera",
  Lampung: "sumatera",
  "Kalimantan Barat": "kalimantan",
  "Kalimantan Timur": "kalimantan",
  "Kalimantan Selatan": "kalimantan",
  "Sulawesi Selatan": "sulawesi",
  "Sulawesi Utara": "sulawesi",
  Bali: "nusa",
  "Nusa Tenggara Barat": "nusa",
  Maluku: "timur",
  Papua: "timur",
};

// [slug, kecamatan, kota, provinsi, kode pos]. Data contoh, bukan data resmi
const RAW: [string, string, string, string, string][] = [
  ["SBY-GUBENG", "Gubeng", "Surabaya", "Jawa Timur", "60281"],
  ["SBY-TEGALSARI", "Tegalsari", "Surabaya", "Jawa Timur", "60261"],
  ["SBY-RUNGKUT", "Rungkut", "Surabaya", "Jawa Timur", "60293"],
  ["SBY-WONOKROMO", "Wonokromo", "Surabaya", "Jawa Timur", "60243"],
  ["SBY-SUKOLILO", "Sukolilo", "Surabaya", "Jawa Timur", "60111"],
  ["SDA-WARU", "Waru", "Sidoarjo", "Jawa Timur", "61256"],
  ["SDA-SIDOARJO", "Sidoarjo", "Sidoarjo", "Jawa Timur", "61211"],
  ["MLG-LOWOKWARU", "Lowokwaru", "Malang", "Jawa Timur", "65141"],
  ["MLG-KLOJEN", "Klojen", "Malang", "Jawa Timur", "65111"],
  ["JKT-KEBAYORAN", "Kebayoran Baru", "Jakarta Selatan", "DKI Jakarta", "12110"],
  ["JKT-TEBET", "Tebet", "Jakarta Selatan", "DKI Jakarta", "12810"],
  ["JKT-MENTENG", "Menteng", "Jakarta Pusat", "DKI Jakarta", "10310"],
  ["JKT-TANAHABANG", "Tanah Abang", "Jakarta Pusat", "DKI Jakarta", "10250"],
  ["JKT-KEBONJERUK", "Kebon Jeruk", "Jakarta Barat", "DKI Jakarta", "11530"],
  ["BDG-COBLONG", "Coblong", "Bandung", "Jawa Barat", "40132"],
  ["BDG-CICENDO", "Cicendo", "Bandung", "Jawa Barat", "40171"],
  ["BKS-BEKASISELATAN", "Bekasi Selatan", "Bekasi", "Jawa Barat", "17144"],
  ["DPK-BEJI", "Beji", "Depok", "Jawa Barat", "16421"],
  ["TNG-SERPONG", "Serpong", "Tangerang Selatan", "Banten", "15310"],
  ["SMG-SEMARANGTENGAH", "Semarang Tengah", "Semarang", "Jawa Tengah", "50134"],
  ["SKA-LAWEYAN", "Laweyan", "Surakarta", "Jawa Tengah", "57148"],
  ["YGY-GONDOKUSUMAN", "Gondokusuman", "Yogyakarta", "DI Yogyakarta", "55223"],
  ["DPS-DENPASARSELATAN", "Denpasar Selatan", "Denpasar", "Bali", "80224"],
  ["MTR-CAKRANEGARA", "Cakranegara", "Mataram", "Nusa Tenggara Barat", "83231"],
  ["MDN-MEDANBARU", "Medan Baru", "Medan", "Sumatera Utara", "20153"],
  ["PDG-PADANGBARAT", "Padang Barat", "Padang", "Sumatera Barat", "25111"],
  ["PKU-SUKAJADI", "Sukajadi", "Pekanbaru", "Riau", "28156"],
  ["PLG-ILIRBARAT", "Ilir Barat I", "Palembang", "Sumatera Selatan", "30139"],
  ["BDL-TANJUNGKARANG", "Tanjung Karang Pusat", "Bandar Lampung", "Lampung", "35111"],
  ["PTK-PONTIANAKKOTA", "Pontianak Kota", "Pontianak", "Kalimantan Barat", "78111"],
  ["BPN-BALIKPAPANSELATAN", "Balikpapan Selatan", "Balikpapan", "Kalimantan Timur", "76114"],
  ["BJM-BANJARMASINTENGAH", "Banjarmasin Tengah", "Banjarmasin", "Kalimantan Selatan", "70111"],
  ["MKS-PANAKKUKANG", "Panakkukang", "Makassar", "Sulawesi Selatan", "90231"],
  ["MDO-WENANG", "Wenang", "Manado", "Sulawesi Utara", "95111"],
  ["AMQ-SIRIMAU", "Sirimau", "Ambon", "Maluku", "97124"],
  ["DJJ-JAYAPURAUTARA", "Jayapura Utara", "Jayapura", "Papua", "99112"],
];

const AREAS: ShippingArea[] = RAW.map(([slug, district, city, province, postalCode]) => ({
  id: `MOCK-${slug}`,
  label: `${district}, ${city}, ${province}. ${postalCode}`,
  province,
  city,
  district,
  postalCode,
}));

interface Loc {
  island: Island;
  province?: string;
  city?: string;
}

function locate(point: { areaId?: string; postalCode: string }): Loc {
  const area =
    AREAS.find((a) => point.areaId && a.id === point.areaId) ??
    AREAS.find((a) => a.postalCode === point.postalCode);
  if (area) {
    return {
      island: ISLAND_BY_PROVINCE[area.province] ?? "jawa",
      province: area.province,
      city: area.city,
    };
  }
  // Kode pos tidak dikenal: tebak pulau dari digit pertama
  const first = point.postalCode.charAt(0);
  const island: Island =
    first === "2" || first === "3"
      ? "sumatera"
      : first === "7"
        ? "kalimantan"
        : first === "8"
          ? "nusa"
          : first === "9"
            ? "sulawesi"
            : "jawa";
  return { island };
}

function factor(o: Loc, d: Loc): number {
  if (o.city && o.city === d.city) return 1;
  if (o.province && o.province === d.province) return 1.4;
  if (o.island === d.island) return 2;
  if (o.island === "timur" || d.island === "timur") return 4.5;
  return 3;
}

const SERVICES = [
  { courierCode: "jne", courierName: "JNE", serviceCode: "reg", serviceName: "REG", description: "Layanan reguler", base: 9000, perKg: 4000, express: false },
  { courierCode: "jne", courierName: "JNE", serviceCode: "yes", serviceName: "YES", description: "Yakin esok sampai (satu pulau)", base: 20000, perKg: 9000, express: true },
  { courierCode: "jnt", courierName: "J&T", serviceCode: "ez", serviceName: "EZ", description: "Layanan reguler", base: 8500, perKg: 3500, express: false },
  { courierCode: "sicepat", courierName: "SiCepat", serviceCode: "reg", serviceName: "REG", description: "Layanan reguler", base: 8000, perKg: 3800, express: false },
  { courierCode: "sicepat", courierName: "SiCepat", serviceCode: "best", serviceName: "BEST", description: "Besok sampai tujuan (satu pulau)", base: 17000, perKg: 8000, express: true },
  { courierCode: "anteraja", courierName: "AnterAja", serviceCode: "reg", serviceName: "REG", description: "Layanan reguler", base: 8500, perKg: 3600, express: false },
];

const roundTo500 = (n: number) => Math.round(n / 500) * 500;

export const mockProvider: ShippingProvider = {
  name: "mock",

  async searchAreas(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return AREAS.filter((a) => tokens.every((t) => a.label.toLowerCase().includes(t))).slice(0, 10);
  },

  async getRates({ origin, destination, weightGram }: RateQuery) {
    const o = locate(origin);
    const d = locate(destination);
    const f = factor(o, d);
    const kg = Math.max(1, Math.ceil(weightGram / 1000));

    const rates: ShippingRate[] = [];
    for (const s of SERVICES) {
      // Layanan ekspres hanya tersedia dalam satu pulau (untuk menguji layanan yang tidak tersedia)
      if (s.express && o.island !== d.island) continue;

      const etdMin = s.express ? 1 : Math.ceil(f);
      const etdMax = s.express ? (f <= 1.4 ? 1 : 2) : etdMin + 2;

      rates.push({
        courierCode: s.courierCode,
        courierName: s.courierName,
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        description: s.description,
        price: roundTo500((s.base + s.perKg * kg) * f),
        etdMinDays: etdMin,
        etdMaxDays: Math.max(etdMin, etdMax),
      });
    }
    return rates;
  },
};