import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminRevenue } from "../../services/admin";
import { formatRupiah, formatRupiahCompact } from "../../lib/format";
import type { RevenueRange } from "../../types";

const RANGES: { value: RevenueRange; label: string; hint: string }[] = [
  { value: "7d", label: "7 hari", hint: "7 hari terakhir, per hari" },
  { value: "30d", label: "1 bulan", hint: "30 hari terakhir, per hari" },
  { value: "12m", label: "1 tahun", hint: "12 bulan terakhir, per bulan" },
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const CHART_HEIGHT = 180;

/** Membulatkan ke skala yang enak dibaca: 1, 2, 2,5, 5 atau 10 x pangkat sepuluh */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

function shortLabel(key: string, range: RevenueRange): string {
  if (range === "12m") {
    const [year, month] = key.split("-");
    return `${MONTH_SHORT[Number(month) - 1]} ${year.slice(2)}`;
  }
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

function longLabel(key: string, range: RevenueRange): string {
  if (range === "12m") {
    const [year, month] = key.split("-");
    return `${MONTH_LONG[Number(month) - 1]} ${year}`;
  }
  const [year, month, day] = key.split("-");
  return `${Number(day)} ${MONTH_SHORT[Number(month) - 1]} ${year}`;
}

// Pada banyak batang, hanya sebagian label yang ditampilkan agar tidak bertumpuk
function showLabel(index: number, count: number): boolean {
  if (count <= 12) return true;
  if (index === count - 1) return true;
  return index % 5 === 0 && count - 1 - index >= 3;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 p-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-lg font-bold">{value}</p>
    </div>
  );
}

export default function RevenueChart() {
  const [range, setRange] = useState<RevenueRange>("7d");
  const [active, setActive] = useState<number | null>(null);

  const series = useQuery({
    queryKey: ["admin-revenue", range],
    queryFn: () => getAdminRevenue(range),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const data = series.data;
  const buckets = data?.buckets ?? [];
  const max = Math.max(0, ...buckets.map((b) => b.total));
  const top = niceMax(max);
  const average = data && data.orders > 0 ? Math.round(data.total / data.orders) : 0;
  const shown = active !== null ? buckets[active] : undefined;
  const current = RANGES.find((r) => r.value === range) ?? RANGES[0];

  return (
    <section className="border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">Pendapatan</h2>
          <p className="text-xs text-neutral-500">{current.hint}</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Rentang waktu">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => {
                setRange(r.value);
                setActive(null);
              }}
              className={`border px-3 py-1.5 text-sm ${
                range === r.value
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 hover:border-black"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {series.isLoading && <p className="mt-6 text-sm text-neutral-500">Memuat grafik...</p>}

      {series.isError && (
        <p className="mt-6 text-sm text-red-600">
          Gagal memuat grafik.{" "}
          <button type="button" onClick={() => series.refetch()} className="underline">
            Coba lagi
          </button>
        </p>
      )}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Summary label="Total pendapatan" value={formatRupiah(data.total)} />
            <Summary label="Pesanan dibayar" value={String(data.orders)} />
            <Summary label="Rata-rata per pesanan" value={data.orders > 0 ? formatRupiah(average) : "-"} />
          </div>

          <div className="mt-6">
            {/* Area grafik */}
            <div className="relative ml-14" style={{ height: CHART_HEIGHT }}>
              {[0, 0.5, 1].map((t) => (
                <div
                  key={t}
                  className="absolute inset-x-0 border-t border-neutral-200"
                  style={{ bottom: `${t * 100}%` }}
                >
                  <span className="absolute -left-14 w-12 -translate-y-1/2 text-right text-xs text-neutral-500">
                    {formatRupiahCompact(top * t)}
                  </span>
                </div>
              ))}

              <div className="absolute inset-0 flex items-end gap-1">
                {buckets.map((b, i) => {
                  const height = b.total > 0 ? Math.max(3, Math.round((b.total / top) * CHART_HEIGHT)) : 2;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      aria-label={`${longLabel(b.key, range)}: ${formatRupiah(b.total)}, ${b.orders} pesanan`}
                      className="flex h-full flex-1 items-end focus:outline-none"
                    >
                      <span
                        className={`block w-full ${
                          b.total === 0 ? "bg-neutral-200" : active === i ? "bg-neutral-600" : "bg-black"
                        }`}
                        style={{ height }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label sumbu X */}
            <div className="ml-14 mt-2 flex gap-1">
              {buckets.map((b, i) => (
                <span key={b.key} className="relative h-4 flex-1">
                  {showLabel(i, buckets.length) && (
                    <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-neutral-500">
                      {shortLabel(b.key, range)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-4 min-h-5 text-sm" aria-live="polite">
            {shown ? (
              <>
                <span className="font-medium">{longLabel(shown.key, range)}</span>: {formatRupiah(shown.total)}{" "}
                &middot; {shown.orders} pesanan
              </>
            ) : (
              <span className="text-neutral-500">Arahkan kursor (atau ketuk) sebuah batang untuk melihat detailnya.</span>
            )}
          </p>

          {data.total === 0 && (
            <p className="text-xs text-neutral-500">Belum ada pembayaran pada periode ini.</p>
          )}
        </>
      )}
    </section>
  );
}