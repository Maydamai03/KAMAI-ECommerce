import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getCategories, getProducts } from "../services/catalog";
import { formatRupiah } from "../lib/format";
import { ArrowRightIcon, CloseIcon, SearchIcon } from "./icons";
import { sizedImage } from "../lib/image";

const pill =
  "inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-800 transition-colors hover:border-black hover:bg-black hover:text-white";

export default function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const term = useDebouncedValue(trimmed, 300);
  const typing = trimmed.length >= 2;

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });

  const suggestions = useQuery({
    queryKey: ["search-suggest", term.toLowerCase()],
    queryFn: () => getProducts({ q: term, limit: 5 }),
    enabled: term.length >= 2,
    staleTime: 60_000,
    retry: false,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    onClose();
  }

  const searching = suggestions.isFetching || term !== trimmed;
  const results = suggestions.data?.items ?? [];

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <p className="text-sm font-semibold uppercase tracking-widest">Search</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pencarian"
          className="rounded-full p-2 transition-colors hover:bg-neutral-100"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <form onSubmit={submit} role="search">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              autoFocus
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cari nama produk..."
              aria-label="Cari nama produk"
              className="w-full rounded-full border border-neutral-300 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-black"
            />
          </div>
        </form>

        {!typing ? (
          <div className="mt-8 space-y-7">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Rekomendasi</h2>
              <div className="flex flex-wrap gap-2">
                <Link to="/products?collection=new" onClick={onClose} className={pill}>
                  New Release
                </Link>
                <Link to="/products?collection=popular" onClick={onClose} className={pill}>
                  Populer
                </Link>
              </div>
            </section>

            {categories.data && categories.data.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Kategori</h2>
                <div className="flex flex-wrap gap-2">
                  {categories.data.map((c) => (
                    <Link key={c.id} to={`/products?category=${c.slug}`} onClick={onClose} className={pill}>
                      {c.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <Link to="/products" onClick={onClose} className="inline-flex items-center gap-2 text-sm underline">
              Lihat semua produk
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6" aria-live="polite">
            {searching && <p className="text-sm text-neutral-500">Mencari...</p>}
            {suggestions.isError && !searching && (
              <p className="text-sm text-red-600">Gagal mencari produk. Coba lagi.</p>
            )}
            {!searching && !suggestions.isError && results.length === 0 && (
              <p className="text-sm text-neutral-500">Tidak ada produk yang cocok dengan &quot;{trimmed}&quot;.</p>
            )}

            {!searching && results.length > 0 && (
              <>
                <ul className="divide-y divide-neutral-100">
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/products/${p.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 py-3 transition-colors hover:bg-neutral-50"
                      >
                        <div className="h-16 w-12 shrink-0 overflow-hidden bg-neutral-100">
                          {p.image && <img src={sizedImage(p.image, 160)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-sm text-neutral-600">{formatRupiah(p.price)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/products?q=${encodeURIComponent(trimmed)}`}
                  onClick={onClose}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium underline"
                >
                  Lihat semua hasil
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}