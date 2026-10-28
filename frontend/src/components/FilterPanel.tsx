import type { ReactNode } from "react";
import { ChevronDownIcon } from "./icons";
import type { Category, FilterOptions } from "../types";

export const PRICE_RANGES = [
  { key: "lt200", label: "Di bawah Rp200.000", min: undefined, max: 199999 },
  { key: "200-349", label: "Rp200.000 - Rp349.000", min: 200000, max: 349000 },
  { key: "gte350", label: "Rp350.000 ke atas", min: 350000, max: undefined },
] as const;

export type PriceRange = (typeof PRICE_RANGES)[number];

export function priceKey(min?: string, max?: string): string | null {
  const found = PRICE_RANGES.find(
    (r) =>
      (min ?? "") === (r.min !== undefined ? String(r.min) : "") &&
      (max ?? "") === (r.max !== undefined ? String(r.max) : "")
  );
  return found?.key ?? null;
}

const COLOR_HEX: Record<string, string> = {
  hitam: "#111111",
  putih: "#ffffff",
  krem: "#f1e6d0",
  beige: "#e6d7c0",
  abu: "#9ca3af",
  "abu-abu": "#9ca3af",
  navy: "#1e2a4a",
  biru: "#2f5fd0",
  "biru muda": "#9cc7ee",
  "biru tua": "#1d3a6e",
  hijau: "#2f8f5b",
  "hijau army": "#4b5d3a",
  khaki: "#c3b091",
  merah: "#c0392b",
  maroon: "#6d1f2c",
  coklat: "#7b4a2d",
  cokelat: "#7b4a2d",
  pink: "#f4a6c0",
  salem: "#f2b3a0",
  kuning: "#f2c94c",
  mustard: "#d1a21e",
  oranye: "#f08a24",
  ungu: "#7a4fb0",
};

const chip = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
    active
      ? "border-black bg-black text-white"
      : "border-neutral-200 bg-white text-neutral-700 hover:border-black"
  }`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-widest text-neutral-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

interface Props {
  categories: Category[];
  options?: FilterOptions;
  category?: string;
  size?: string;
  color?: string;
  price: string | null;
  activeCount: number;
  className?: string;
  onCategory: (slug?: string) => void;
  onSize: (size?: string) => void;
  onColor: (color?: string) => void;
  onPrice: (range: PriceRange | null) => void;
  onReset: () => void;
}

export default function FilterPanel({
  categories,
  options,
  category,
  size,
  color,
  price,
  activeCount,
  className = "",
  onCategory,
  onSize,
  onColor,
  onPrice,
  onReset,
}: Props) {
  return (
    <aside
      aria-label="Filter produk"
      className={`rounded-2xl border border-neutral-200 bg-white shadow-sm md:sticky md:top-24 md:self-start ${className}`}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <h2 className="text-sm font-semibold tracking-wide">
          Filter
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">{activeCount}</span>
          )}
        </h2>
        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="text-xs text-neutral-500 underline hover:text-black">
            Reset
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-100">
        {categories.length > 0 && (
          <Section title="Kategori">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={category === c.slug}
                  onClick={() => onCategory(category === c.slug ? undefined : c.slug)}
                  className={chip(category === c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Section>
        )}

        {options && options.sizes.length > 0 && (
          <Section title="Ukuran">
            <div className="flex flex-wrap gap-2">
              {options.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  onClick={() => onSize(size === s ? undefined : s)}
                  className={`min-w-11 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    size === s
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-black"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Section>
        )}

        {options && options.colors.length > 0 && (
          <Section title="Warna">
            <div className="flex flex-wrap gap-2">
              {options.colors.map((c) => {
                const hex = COLOR_HEX[c.trim().toLowerCase()];
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onColor(active ? undefined : c)}
                    className={`${chip(active)} inline-flex items-center gap-2`}
                  >
                    {hex && (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: hex }}
                      />
                    )}
                    {c}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <Section title="Harga">
          <div className="space-y-2">
            {PRICE_RANGES.map((r) => {
              const active = price === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPrice(active ? null : r)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-black"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </aside>
  );
}