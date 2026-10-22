import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = "https://emsifa.github.io/api-wilayah-indonesia/api";
const KEEP_UPPER = new Set(["DKI", "DI", "NTB", "NTT"]);
const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/;

function titleCase(text) {
  return text
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((part) => {
      const up = part.toUpperCase();
      if (KEEP_UPPER.has(up) || ROMAN.test(up)) return up;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

async function getJson(path, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${BASE}/${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw new Error(`Gagal mengambil ${path}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

const provinceList = await getJson("provinces.json");
console.log(`Provinsi: ${provinceList.length}`);

const regencyGroups = await mapLimit(provinceList, 6, (p) => getJson(`regencies/${p.id}.json`));
const regencyList = regencyGroups.flat();
console.log(`Kabupaten/Kota: ${regencyList.length}`);

let done = 0;
const districtGroups = await mapLimit(regencyList, 8, async (r) => {
  const rows = await getJson(`districts/${r.id}.json`);
  done++;
  if (done % 100 === 0) console.log(`  kecamatan: ${done}/${regencyList.length} kabupaten/kota diproses`);
  return rows.map((d) => [String(d.id), titleCase(d.name), String(r.id)]);
});
const districts = districtGroups.flat();
console.log(`Kecamatan: ${districts.length}`);

if (provinceList.length < 30 || districts.length < 6000) {
  throw new Error("Data tidak lengkap, file tidak ditulis. Coba jalankan ulang.");
}

const data = {
  generatedAt: new Date().toISOString(),
  provinces: Object.fromEntries(provinceList.map((p) => [String(p.id), titleCase(p.name)])),
  regencies: Object.fromEntries(regencyList.map((r) => [String(r.id), titleCase(r.name)])),
  districts,
};

const target = fileURLToPath(new URL("../data/wilayah.json", import.meta.url));
await mkdir(fileURLToPath(new URL("../data", import.meta.url)), { recursive: true });
await writeFile(target, JSON.stringify(data));
console.log(`Selesai. Ditulis ke ${target}`);