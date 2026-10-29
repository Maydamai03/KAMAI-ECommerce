import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCategories, getFilterOptions, getProducts } from "../services/catalog";
import type { ProductListParams } from "../services/catalog";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import Pagination from "../components/Pagination";
import GlassSelect from "../components/GlassSelect";
import FilterPanel, { PRICE_RANGES, priceKey } from "../components/FilterPanel";
import { CloseIcon, FilterIcon, SearchIcon } from "../components/icons";
import { useSeo } from "../hooks/usePageMeta";
import { useStoreInfo } from "../hooks/useStoreInfo";

const SORTS = [
  { value: "newest", label: "Terbaru" },
  { value: "price_asc", label: "Harga: rendah ke tinggi" },
  { value: "price_desc", label: "Harga: tinggi ke rendah" },
] as const;

const COLLECTIONS = { new: "Rilis Terbaru", popular: "Populer" } as const;
type Collection = keyof typeof COLLECTIONS;

const LIMIT = 12;

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get("category") ?? undefined;
  const size = searchParams.get("size") ?? undefined;
  const color = searchParams.get("color") ?? undefined;
  const minPrice = searchParams.get("minPrice") ?? undefined;
  const maxPrice = searchParams.get("maxPrice") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const rawCollection = searchParams.get("collection");
  const collection: Collection | undefined =
    rawCollection === "new" || rawCollection === "popular" ? rawCollection : undefined;
  const sortParam = searchParams.get("sort");
  const sort = (SORTS.some((s) => s.value === sortParam) ? sortParam : "newest") as NonNullable<
    ProductListParams["sort"]
  >;
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

  function resetFilters() {
    setSearchParams(new URLSearchParams());
  }

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const options = useQuery({ queryKey: ["filter-options"], queryFn: getFilterOptions });

  const products = useQuery({
    queryKey: ["products", { category, size, color, minPrice, maxPrice, q, sort, page, collection }],
    queryFn: () =>
      getProducts({
        category,
        size,
        color,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        q,
        sort,
        featured: collection === "popular" ? "true" : undefined,
        page,
        limit: LIMIT,
      }),
    placeholderData: keepPreviousData,
  });

  const categoryName = categories.data?.find((c) => c.slug === category)?.name;
  const activePriceKey = priceKey(minPrice, maxPrice);
  const activePrice = PRICE_RANGES.find((r) => r.key === activePriceKey);
  const pagination = products.data?.pagination;

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (collection) {
    chips.push({ key: "collection", label: COLLECTIONS[collection], remove: () => update({ collection: undefined }) });
  }
  if (category) {
    chips.push({ key: "category", label: categoryName ?? category, remove: () => update({ category: undefined }) });
  }
  if (size) chips.push({ key: "size", label: `Ukuran ${size}`, remove: () => update({ size: undefined }) });
  if (color) chips.push({ key: "color", label: `Warna ${color}`, remove: () => update({ color: undefined }) });
  if (minPrice || maxPrice) {
    chips.push({
      key: "price",
      label: activePrice?.label ?? "Rentang harga",
      remove: () => update({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (q) chips.push({ key: "q", label: `"${q}"`, remove: () => update({ q: undefined }) });

  const title = collection ? COLLECTIONS[collection] : (categoryName ?? "Semua Produk");
  const { data: store } = useStoreInfo();
  const storeName = store?.name ?? "Kamai";
  const filtered = Boolean(q || size || color || minPrice || maxPrice || collection || sortParam || page > 1);
  useSeo({
    title: `${title} | ${storeName}`,
    description: `Belanja ${title.toLowerCase()} di ${storeName}. Pilihan ukuran dan warna lengkap.`,
    path: category ? `/products?category=${category}` : "/products",
    // Kombinasi filter dan halaman lanjutan tidak perlu muncul di hasil pencarian
    robots: filtered ? "noindex, follow" : undefined,
  });

  function goToPage(next: number) {
    update({ page: next > 1 ? String(next) : undefined }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {pagination && <p className="mt-1 text-sm text-neutral-500">{pagination.total} produk</p>}

      {/* Bar atas: cari, urutkan, filter (mobile) */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            update({ q: value || undefined });
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              key={q ?? ""}
              name="q"
              defaultValue={q}
              placeholder="Cari produk..."
              className="w-full rounded-full border border-neutral-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-black"
              aria-label="Cari produk"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Cari
          </button>
        </form>

        <div className="flex gap-2">
          <div className="flex-1 sm:w-60 sm:flex-none">
            <GlassSelect
              label="Urutkan"
              value={sort}
              options={SORTS}
              onChange={(value) => update({ sort: value === "newest" ? undefined : value })}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium md:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            Filter{chips.length > 0 ? ` (${chips.length})` : ""}
          </button>
        </div>
      </div>

      {/* Filter aktif */}
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-3 pr-1.5 text-xs text-neutral-800"
            >
              {c.label}
              <button
                type="button"
                onClick={c.remove}
                aria-label={`Hapus filter ${c.label}`}
                className="rounded-full p-0.5 hover:bg-neutral-300"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button type="button" onClick={resetFilters} className="text-xs text-neutral-500 underline hover:text-black">
            Hapus semua
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
        <FilterPanel
          className={showFilters ? "block" : "hidden md:block"}
          categories={categories.data ?? []}
          options={options.data}
          category={category}
          size={size}
          color={color}
          price={activePriceKey}
          activeCount={chips.length}
          onCategory={(slug) => update({ category: slug })}
          onSize={(value) => update({ size: value })}
          onColor={(value) => update({ color: value })}
          onPrice={(range) =>
            update({
              minPrice: range?.min !== undefined ? String(range.min) : undefined,
              maxPrice: range?.max !== undefined ? String(range.max) : undefined,
            })
          }
          onReset={resetFilters}
        />

        {/* Hasil */}
        <section>
          {products.isError && (
            <p className="text-sm text-red-600">Gagal memuat produk. Pastikan backend berjalan.</p>
          )}

          <div
            className={`grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 ${
              products.isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            {products.isLoading && Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            {products.data?.items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
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