import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCategories, getFilterOptions, getProducts } from "../services/catalog";
import type { ProductListParams } from "../services/catalog";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import Pagination from "../components/Pagination";
import { formatRupiah } from "../lib/format";

const SORTS = [
  { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga: rendah ke tinggi" },
  { value: "price_desc", label: "Harga: tinggi ke rendah" },
] as const;

const PRICE_RANGES = [
  { label: "Di bawah Rp200.000", min: undefined, max: 199999 },
  { label: "Rp200.000 - Rp349.000", min: 200000, max: 349000 },
  { label: "Rp350.000 ke atas", min: 350000, max: undefined },
];

const LIMIT = 10;
// ubah buat pagination

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get("category") ?? undefined;
  const size = searchParams.get("size") ?? undefined;
  const color = searchParams.get("color") ?? undefined;
  const minPrice = searchParams.get("minPrice") ?? undefined;
  const maxPrice = searchParams.get("maxPrice") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort = SORTS.some((s) => s.value === sortParam)
    ? (sortParam as ProductListParams["sort"])
    : "newest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next);
  }

  function toggle(key: string, current: string | undefined, value: string) {
    update({ [key]: current === value ? undefined : value });
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams());
  }

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const options = useQuery({ queryKey: ["filter-options"], queryFn: getFilterOptions });

  const products = useQuery({
    queryKey: ["products", { category, size, color, minPrice, maxPrice, q, sort, page }],
    queryFn: () =>
      getProducts({
        category,
        size,
        color,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        q,
        sort,
        page,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
  });

  const activeFilterCount = [category, size, color, minPrice || maxPrice, q].filter(Boolean).length;
  const categoryName = categories.data?.find((c) => c.slug === category)?.name;
  const pagination = products.data?.pagination;

  function goToPage(next: number) {
    update({ page: next > 1 ? String(next) : undefined }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const chip = (active: boolean) =>
    `border px-3 py-1.5 text-sm transition-colors ${
      active ? "border-black bg-black text-white" : "border-neutral-300 hover:border-black"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">{categoryName ?? "Semua Produk"}</h1>
      {pagination && (
        <p className="mt-1 text-sm text-neutral-500">{pagination.total} produk</p>
      )}

      {/* Bar atas: cari + urutkan + tombol filter (mobile) */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            update({ q: value || undefined });
          }}
        >
          <input
            key={q ?? ""}
            name="q"
            defaultValue={q}
            placeholder="Cari produk..."
            className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
          <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
            Cari
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value === "newest" ? undefined : e.target.value })}
            className="flex-1 border border-neutral-300 px-3 py-2 text-sm sm:flex-none"
            aria-label="Urutkan"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="border border-neutral-300 px-4 py-2 text-sm md:hidden"
          >
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
        {/* Panel filter */}
        <aside className={`${showFilters ? "block" : "hidden"} space-y-6 md:block`}>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Kategori</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => update({ category: undefined })} className={chip(!category)}>
                Semua
              </button>
              {categories.data?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle("category", category, c.slug)}
                  className={chip(category === c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Ukuran</h2>
            <div className="flex flex-wrap gap-2">
              {options.data?.sizes.map((s) => (
                <button key={s} type="button" onClick={() => toggle("size", size, s)} className={chip(size === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Warna</h2>
            <div className="flex flex-wrap gap-2">
              {options.data?.colors.map((c) => (
                <button key={c} type="button" onClick={() => toggle("color", color, c)} className={chip(color === c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Harga</h2>
            <div className="flex flex-col gap-2">
              {PRICE_RANGES.map((r) => {
                const active =
                  (minPrice ?? "") === (r.min !== undefined ? String(r.min) : "") &&
                  (maxPrice ?? "") === (r.max !== undefined ? String(r.max) : "");
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() =>
                      update(
                        active
                          ? { minPrice: undefined, maxPrice: undefined }
                          : {
                              minPrice: r.min !== undefined ? String(r.min) : undefined,
                              maxPrice: r.max !== undefined ? String(r.max) : undefined,
                            }
                      )
                    }
                    className={`${chip(active)} text-left`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {options.data && (
              <p className="mt-2 text-xs text-neutral-500">
                Harga mulai {formatRupiah(options.data.minPrice)}
              </p>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button type="button" onClick={resetFilters} className="text-sm underline">
              Hapus semua filter
            </button>
          )}
        </aside>

        {/* Hasil */}
        <section>
          {products.isError && (
            <p className="text-sm text-red-600">Gagal memuat produk. Pastikan backend berjalan.</p>
          )}

          <div
            className={`grid grid-cols-2 gap-4 lg:grid-cols-3 md:gap-6 ${
              products.isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            {products.isLoading &&
              Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            {products.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {products.data && products.data.items.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-medium">Tidak ada produk yang cocok.</p>
              <button type="button" onClick={resetFilters} className="mt-3 text-sm underline">
                Hapus semua filter
              </button>
            </div>
          )}

          {pagination && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={goToPage} />
          )}
        </section>
      </div>
    </div>
  );
}