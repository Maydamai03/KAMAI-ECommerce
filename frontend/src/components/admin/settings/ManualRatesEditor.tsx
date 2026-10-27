import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AreaPicker from "../../AreaPicker";
import { previewRates, resetManualRates, saveManualRates } from "../../../services/admin";
import { errorText } from "../../../lib/apiError";
import { formatEtd, formatRupiah } from "../../../lib/format";
import type { ManualConfig, RuleScope, ShippingArea, ShippingRate } from "../../../types";

const SCOPES: { value: RuleScope; label: string; needsValue: boolean }[] = [
  { value: "same_city", label: "Satu kota dengan gudang", needsValue: false },
  { value: "same_province", label: "Satu provinsi dengan gudang", needsValue: false },
  { value: "same_island", label: "Satu pulau dengan gudang", needsValue: false },
  { value: "island", label: "Pulau tertentu", needsValue: true },
  { value: "province", label: "Provinsi tertentu", needsValue: true },
  { value: "city", label: "Kota/kabupaten tertentu", needsValue: true },
  { value: "default", label: "Semua tujuan lainnya", needsValue: false },
];

const SCOPE_LABEL = Object.fromEntries(SCOPES.map((s) => [s.value, s.label])) as Record<string, string>;

const ISLANDS = [
  { value: "sumatera", label: "Sumatera" },
  { value: "jawa", label: "Jawa" },
  { value: "nusa", label: "Bali & Nusa Tenggara" },
  { value: "kalimantan", label: "Kalimantan" },
  { value: "sulawesi", label: "Sulawesi" },
  { value: "timur", label: "Maluku & Papua" },
];

interface RuleRow {
  key: string;
  scope: RuleScope;
  value: string;
  firstKg: string;
  nextKg: string;
  etdMin: string;
  etdMax: string;
}

interface ServiceRow {
  key: string;
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  maxKg: string;
  rules: RuleRow[];
}

let seq = 0;
const nextKey = () => `k${++seq}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const toInt = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);

function newRule(scope: RuleScope = "default"): RuleRow {
  return { key: nextKey(), scope, value: "", firstKg: "", nextKg: "", etdMin: "", etdMax: "" };
}

function toRows(config: ManualConfig | null): ServiceRow[] {
  if (!config) return [];
  return config.services.map((s) => ({
    key: nextKey(),
    courierCode: s.courierCode,
    courierName: s.courierName,
    serviceCode: s.serviceCode,
    serviceName: s.serviceName,
    description: s.description,
    maxKg: s.maxWeightGram ? String(Math.round(s.maxWeightGram / 1000)) : "",
    rules: s.rules.map((r) => ({
      key: nextKey(),
      scope: r.scope,
      value: r.value ?? "",
      firstKg: String(r.firstKg),
      nextKg: String(r.nextKg),
      etdMin: String(r.etdMin),
      etdMax: String(r.etdMax),
    })),
  }));
}

function toConfig(rows: ServiceRow[]): { config?: ManualConfig; problems: string[] } {
  const problems: string[] = [];
  if (rows.length === 0) problems.push("Tambahkan minimal satu layanan.");

  const pairs = new Set<string>();

  const services = rows.map((s, si) => {
    const courierName = s.courierName.trim();
    const serviceName = s.serviceName.trim();
    const label = courierName && serviceName ? `${courierName} ${serviceName}` : `Layanan ${si + 1}`;

    if (!courierName) problems.push(`Layanan ${si + 1}: nama kurir wajib diisi.`);
    if (!serviceName) problems.push(`Layanan ${si + 1}: nama layanan wajib diisi.`);

    const courierCode = s.courierCode || slug(courierName);
    const serviceCode = s.serviceCode || slug(serviceName);
    if (courierName && serviceName && (!courierCode || !serviceCode)) {
      problems.push(`${label}: nama harus memuat huruf atau angka.`);
    }
    const pair = `${courierCode}|${serviceCode}`;
    if (courierCode && serviceCode) {
      if (pairs.has(pair)) problems.push(`${label}: kurir dan layanan ini sudah ada.`);
      pairs.add(pair);
    }

    let maxWeightGram: number | undefined;
    if (s.maxKg.trim()) {
      const kg = toInt(s.maxKg);
      if (!Number.isFinite(kg) || kg < 1) problems.push(`${label}: berat maksimum harus bilangan bulat 1 kg atau lebih.`);
      else maxWeightGram = kg * 1000;
    }

    if (s.rules.length === 0) problems.push(`${label}: tambahkan minimal satu zona tarif.`);

    const seen = new Set<string>();
    const rules = s.rules.map((r, ri) => {
      const rl = `${label}, zona ${ri + 1}`;
      const def = SCOPES.find((x) => x.value === r.scope) ?? SCOPES[0];
      const value = r.value.trim();

      if (def.needsValue && !value) problems.push(`${rl}: isi nilai zona.`);
      const sig = def.needsValue ? `${r.scope}|${value.toLowerCase()}` : r.scope;
      if (seen.has(sig)) problems.push(`${rl}: zona yang sama muncul lebih dari sekali.`);
      seen.add(sig);

      const firstKg = toInt(r.firstKg);
      const nextKg = toInt(r.nextKg);
      const etdMin = toInt(r.etdMin);
      const etdMax = toInt(r.etdMax);
      if (!Number.isFinite(firstKg)) problems.push(`${rl}: harga kg pertama harus bilangan bulat.`);
      if (!Number.isFinite(nextKg)) problems.push(`${rl}: harga kg berikutnya harus bilangan bulat.`);
      if (!Number.isFinite(etdMin) || !Number.isFinite(etdMax)) {
        problems.push(`${rl}: estimasi hari harus bilangan bulat.`);
      } else if (etdMax < etdMin) {
        problems.push(`${rl}: estimasi maksimum tidak boleh lebih kecil dari minimum.`);
      }

      return { scope: r.scope, ...(def.needsValue ? { value } : {}), firstKg, nextKg, etdMin, etdMax };
    });

    return {
      courierCode,
      courierName,
      serviceCode,
      serviceName,
      description: s.description.trim(),
      ...(maxWeightGram ? { maxWeightGram } : {}),
      rules,
    };
  });

  return problems.length > 0 ? { problems } : { config: { services }, problems };
}

const inputClass = "w-full border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-black";

function Preview() {
  const [area, setArea] = useState<ShippingArea | null>(null);
  const [weight, setWeight] = useState("1000");
  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useMutation({ mutationFn: previewRates });

  async function calculate() {
    setError(null);
    const grams = toInt(weight);
    if (!area) return setError("Cari dan pilih area tujuan.");
    if (!Number.isFinite(grams) || grams < 1) return setError("Berat harus bilangan bulat gram (minimal 1).");
    try {
      setRates(await run.mutateAsync({ areaId: area.id, weightGram: grams }));
    } catch (e) {
      setRates(null);
      setError(errorText(e));
    }
  }

  return (
    <div className="space-y-3 border border-dashed border-neutral-300 p-3">
      <div>
        <p className="text-sm font-medium">Pratinjau tarif</p>
        <p className="text-xs text-neutral-500">
          Memakai tarif yang sudah <strong>tersimpan</strong>. Simpan perubahan dulu sebelum menguji.
        </p>
      </div>

      {area && (
        <p className="border border-black px-3 py-2 text-sm">
          {"\u2713 "}
          {area.label}
        </p>
      )}
      <AreaPicker onSelect={setArea} hasValue={Boolean(area)} />

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="preview-weight" className="mb-1 block text-xs font-medium">Berat paket (gram)</label>
          <input
            id="preview-weight"
            inputMode="numeric"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-36 border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={calculate}
          disabled={run.isPending}
          className="border border-black px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {run.isPending ? "Menghitung..." : "Hitung tarif"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {rates && rates.length === 0 && (
        <p className="text-sm text-neutral-600">Tidak ada layanan yang tersedia untuk tujuan ini.</p>
      )}

      {rates && rates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="pb-1">Layanan</th>
                <th className="pb-1">Tarif</th>
                <th className="pb-1">Estimasi</th>
                <th className="pb-1">Zona yang dipakai</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={`${r.courierCode}:${r.serviceCode}`} className="border-t border-neutral-200">
                  <td className="py-1.5">
                    {r.courierName} {r.serviceName}
                  </td>
                  <td className="py-1.5 font-medium">{formatRupiah(r.price)}</td>
                  <td className="py-1.5">{formatEtd(r.etdMinDays, r.etdMaxDays)}</td>
                  <td className="py-1.5 text-neutral-600">{r.zone ? (SCOPE_LABEL[r.zone] ?? r.zone) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Props {
  initial: ManualConfig | null;
  manualError: string | null;
  provider: string;
}

export default function ManualRatesEditor({ initial, manualError, provider }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ServiceRow[]>(() => toRows(initial));
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const save = useMutation({ mutationFn: saveManualRates });
  const reset = useMutation({ mutationFn: resetManualRates });
  const busy = save.isPending || reset.isPending;

  function afterChange() {
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["shipping-rates"] });
  }

  function patchService(key: string, patch: Partial<ServiceRow>) {
    setRows((cur) => cur.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function patchRule(serviceKey: string, ruleKey: string, patch: Partial<RuleRow>) {
    setRows((cur) =>
      cur.map((s) =>
        s.key === serviceKey
          ? { ...s, rules: s.rules.map((r) => (r.key === ruleKey ? { ...r, ...patch } : r)) }
          : s
      )
    );
  }

  function addService() {
    setRows((cur) => [
      ...cur,
      {
        key: nextKey(),
        courierCode: "",
        courierName: "",
        serviceCode: "",
        serviceName: "",
        description: "",
        maxKg: "",
        rules: [newRule("default")],
      },
    ]);
  }

  async function submit() {
    setMessage(null);
    const result = toConfig(rows);
    setProblems(result.problems);
    if (!result.config) return;
    try {
      const saved = await save.mutateAsync(result.config);
      setRows(toRows(saved));
      afterChange();
      setMessage({ type: "ok", text: "Tarif disimpan dan langsung berlaku untuk perhitungan ongkir berikutnya." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  async function doReset() {
    if (
      !window.confirm(
        "Ganti seluruh tarif dengan tarif contoh bawaan? Tarif yang sekarang tersimpan akan hilang."
      )
    ) {
      return;
    }
    setMessage(null);
    setProblems([]);
    try {
      const saved = await reset.mutateAsync();
      setRows(toRows(saved));
      afterChange();
      setMessage({ type: "ok", text: "Tarif dikembalikan ke tarif contoh." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Tarif ongkos kirim</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Harga = harga kg pertama + (jumlah kg - 1) x harga kg berikutnya. Berat dibulatkan ke atas per
          kilogram (minimal 1 kg). Zona yang paling spesifik dipakai lebih dulu (kota, lalu provinsi, lalu
          pulau, lalu &quot;semua tujuan lainnya&quot;). Layanan tanpa zona yang cocok tidak ditampilkan ke
          pembeli.
        </p>
      </div>

      {provider !== "manual" && (
        <p role="alert" className="border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
          Penyedia ongkir aktif saat ini adalah &quot;{provider}&quot;, sehingga tarif manual di bawah tidak dipakai
          di checkout.
        </p>
      )}

      {manualError && (
        <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {manualError}
        </p>
      )}

      {rows.map((s, si) => (
        <div key={s.key} className="space-y-3 border border-neutral-200 p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">
              {s.courierName.trim() && s.serviceName.trim()
                ? `${s.courierName.trim()} ${s.serviceName.trim()}`
                : `Layanan ${si + 1}`}
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Hapus layanan ini beserta seluruh zonanya?")) {
                  setRows((cur) => cur.filter((x) => x.key !== s.key));
                }
              }}
              className="text-sm text-red-600 underline"
            >
              Hapus layanan
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium">Kurir</label>
              <input
                value={s.courierName}
                onChange={(e) => patchService(s.key, { courierName: e.target.value })}
                placeholder="JNE"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Layanan</label>
              <input
                value={s.serviceName}
                onChange={(e) => patchService(s.key, { serviceName: e.target.value })}
                placeholder="REG"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Keterangan</label>
              <input
                value={s.description}
                onChange={(e) => patchService(s.key, { description: e.target.value })}
                placeholder="Layanan reguler"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Berat maks. (kg)</label>
              <input
                inputMode="numeric"
                value={s.maxKg}
                onChange={(e) => patchService(s.key, { maxKg: e.target.value })}
                placeholder="tanpa batas"
                className={inputClass}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="pb-1 pr-2">Zona tujuan</th>
                  <th className="pb-1 pr-2">Nilai</th>
                  <th className="pb-1 pr-2">Harga kg pertama (Rp)</th>
                  <th className="pb-1 pr-2">Harga tiap kg berikutnya (Rp)</th>
                  <th className="pb-1 pr-2">Estimasi min (hari)</th>
                  <th className="pb-1 pr-2">Estimasi maks (hari)</th>
                  <th className="pb-1" />
                </tr>
              </thead>
              <tbody>
                {s.rules.map((r) => {
                  const def = SCOPES.find((x) => x.value === r.scope) ?? SCOPES[0];
                  return (
                    <tr key={r.key} className="border-t border-neutral-200 align-top">
                      <td className="py-1.5 pr-2">
                        <select
                          value={r.scope}
                          onChange={(e) => patchRule(s.key, r.key, { scope: e.target.value as RuleScope, value: "" })}
                          className={inputClass}
                          aria-label="Zona tujuan"
                        >
                          {SCOPES.map((x) => (
                            <option key={x.value} value={x.value}>
                              {x.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        {r.scope === "island" ? (
                          <select
                            value={r.value}
                            onChange={(e) => patchRule(s.key, r.key, { value: e.target.value })}
                            className={inputClass}
                            aria-label="Pulau"
                          >
                            <option value="">Pilih pulau</option>
                            {ISLANDS.map((i) => (
                              <option key={i.value} value={i.value}>
                                {i.label}
                              </option>
                            ))}
                          </select>
                        ) : def.needsValue ? (
                          <input
                            value={r.value}
                            onChange={(e) => patchRule(s.key, r.key, { value: e.target.value })}
                            placeholder={r.scope === "city" ? "Kota Bandung" : "Jawa Barat"}
                            className={inputClass}
                            aria-label="Nama zona"
                          />
                        ) : (
                          <span className="block px-2 py-1.5 text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2">
                        <input inputMode="numeric" value={r.firstKg} onChange={(e) => patchRule(s.key, r.key, { firstKg: e.target.value })} className={inputClass} aria-label="Harga kg pertama" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input inputMode="numeric" value={r.nextKg} onChange={(e) => patchRule(s.key, r.key, { nextKg: e.target.value })} className={inputClass} aria-label="Harga kg berikutnya" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input inputMode="numeric" value={r.etdMin} onChange={(e) => patchRule(s.key, r.key, { etdMin: e.target.value })} className={inputClass} aria-label="Estimasi minimum" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input inputMode="numeric" value={r.etdMax} onChange={(e) => patchRule(s.key, r.key, { etdMax: e.target.value })} className={inputClass} aria-label="Estimasi maksimum" />
                      </td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setRows((cur) =>
                              cur.map((x) =>
                                x.key === s.key ? { ...x, rules: x.rules.filter((y) => y.key !== r.key) } : x
                              )
                            )
                          }
                          className="text-red-600 underline"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => patchService(s.key, { rules: [...s.rules, newRule("same_city")] })}
            className="text-sm underline"
          >
            + Tambah zona
          </button>
        </div>
      ))}

      {rows.length === 0 && !manualError && (
        <p className="text-sm text-neutral-500">Belum ada layanan.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={addService} disabled={busy} className="border border-black px-4 py-2 text-sm font-medium disabled:opacity-50">
          + Tambah layanan
        </button>
        <button type="button" onClick={doReset} disabled={busy} className="px-4 py-2 text-sm underline disabled:opacity-50">
          Reset ke tarif contoh
        </button>
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-red-600">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {message && (
        <p role={message.type === "error" ? "alert" : "status"} className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {save.isPending ? "Menyimpan..." : "Simpan tarif"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRows(toRows(initial));
            setProblems([]);
            setMessage(null);
          }}
          disabled={busy}
          className="border border-neutral-300 px-6 py-2 text-sm hover:border-black disabled:opacity-50"
        >
          Batalkan perubahan
        </button>
      </div>

      <Preview />
    </section>
  );
}