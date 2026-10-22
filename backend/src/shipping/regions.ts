import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AppError } from "../lib/errors";

export type Island = "sumatera" | "jawa" | "nusa" | "kalimantan" | "sulawesi" | "timur";

// Berdasarkan 2 digit pertama kode provinsi (Kemendagri)
const ISLAND_BY_PROVINCE_CODE: Record<string, Island> = {
  "11": "sumatera", "12": "sumatera", "13": "sumatera", "14": "sumatera", "15": "sumatera",
  "16": "sumatera", "17": "sumatera", "18": "sumatera", "19": "sumatera", "21": "sumatera",
  "31": "jawa", "32": "jawa", "33": "jawa", "34": "jawa", "35": "jawa", "36": "jawa",
  "51": "nusa", "52": "nusa", "53": "nusa",
  "61": "kalimantan", "62": "kalimantan", "63": "kalimantan", "64": "kalimantan", "65": "kalimantan",
  "71": "sulawesi", "72": "sulawesi", "73": "sulawesi", "74": "sulawesi", "75": "sulawesi", "76": "sulawesi",
  "81": "timur", "82": "timur",
  "91": "timur", "92": "timur", "93": "timur", "94": "timur", "95": "timur", "96": "timur",
};

export const islandOf = (provinceId: string): Island | undefined => ISLAND_BY_PROVINCE_CODE[provinceId];

interface WilayahFile {
  provinces: Record<string, string>;
  regencies: Record<string, string>;
  districts: [string, string, string][]; // [id, nama, id kabupaten/kota]
}

export interface District {
  id: string;
  areaId: string;
  name: string;
  regency: string;
  provinceId: string;
  province: string;
  label: string;
  nameLower: string;
  labelLower: string;
}

const DATA_FILE = fileURLToPath(new URL("../../data/wilayah.json", import.meta.url));

let cache: { list: District[]; byAreaId: Map<string, District> } | null = null;

function load() {
  if (cache) return cache;

  let raw: WilayahFile;
  try {
    raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as WilayahFile;
  } catch {
    throw new AppError(
      500,
      "WILAYAH_DATA_MISSING",
      "Data wilayah belum dibuat. Jalankan: node scripts/build-wilayah.mjs"
    );
  }

  const list: District[] = raw.districts.map(([id, name, regencyId]) => {
    const provinceId = regencyId.slice(0, 2);
    const regency = raw.regencies[regencyId] ?? "";
    const province = raw.provinces[provinceId] ?? "";
    const label = `${name}, ${regency}, ${province}`;
    return {
      id,
      areaId: `WIL-${id}`,
      name,
      regency,
      provinceId,
      province,
      label,
      nameLower: name.toLowerCase(),
      labelLower: label.toLowerCase(),
    };
  });

  cache = { list, byAreaId: new Map(list.map((d) => [d.areaId, d])) };
  return cache;
}

export function searchDistricts(query: string, limit = 10): District[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const { list } = load();
  const matches = list.filter((d) => tokens.every((t) => d.labelLower.includes(t)));
  // Nama kecamatan yang diawali kata pertama ditampilkan lebih dulu
  matches.sort(
    (a, b) => Number(!a.nameLower.startsWith(tokens[0])) - Number(!b.nameLower.startsWith(tokens[0]))
  );
  return matches.slice(0, limit);
}

export function findDistrict(areaId?: string): District | undefined {
  if (!areaId) return undefined;
  return load().byAreaId.get(areaId);
}