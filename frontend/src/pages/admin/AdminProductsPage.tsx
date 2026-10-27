import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProduct,
  getAdminCategories,
  getAdminProducts,
  setProductFlags,
} from "../../services/admin";
import Pagination from "../../components/Pagination";
import { errorText } from "../../lib/apiError";
import { formatRupiah } from "../../lib/format";
import { invalidateCatalog } from "../../lib/invalidate";
import type { AdminProductListItem } from "../../types";

type Status = "all" | "active" | "inactive";
interface Notice {
  text: string;
  warnings: string[];
}

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState<Notice | null>(
    (location.state as { notice?: Notice } | null)?.notice ?? null
  );
  const [error, setError] = useState<string | null>(null);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const status = (["all", "active", "inactive"].includes(params.get("status") ?? "")
    ? params.get("status")
    : "all") as Status;
  const page = Math.max(1, Number(params.get("page")) || 1);

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete("page");
    setParams(next);
  }

  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });
  const products = useQuery({
    queryKey: ["admin-products", { q, category, status, page }],
    queryFn: () =>
      getAdminProducts({
        q: q || undefined,
        category: category || undefined,
        status,
        page,
        limit: 15,
      }),
    placeholderData: keepPreviousData,
  });

  const flag = useMutation({
    mutationFn: ({ id, flags }: { id: string; flags: { isActive?: boolean; isFeatured?: boolean } }) =>
      setProductFlags(id, flags),
    onSuccess: () => invalidateCatalog(qc),
  });
  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => invalidateCatalog(qc),
  });

  async function toggle(p: AdminProductListItem, flags: { isActive?: boolean; isFeatured?: boolean }) {
    setError(null);
    try {
      await flag.mutateAsync({ id: p.id, flags });
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function handleDelete(p: AdminProductListItem) {
    if (
      !window.confirm(
        `Hapus produk "${p.name}"?\n\nProduk disembunyikan dari toko, sedangkan riwayat pesanan tetap aman.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await remove.mutateAsync(p.id);
    } catch (e) {
      setError(errorText(e));
    }
  }

  const items = products.data?.items ?? [];
  const pagination = products.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Produk</h1>
        <Link
          to="/admin/products/new"
          className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Tambah produk
        </Link>
      </div>

      {notice && (
        <div role="status" className="border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <div className="flex items-start justify-between gap-3">
            <p>{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan">
              &times;
            </button>
          </div>
          {notice.warnings.map((w) => (
            <p key={w} className="mt-1 text-orange-800">
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-3 border border-neutral-200 bg-white p-4 md:grid-cols-[1fr_200px_160px]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            update({ q: value || undefined });
          }}
        >
          <input
            key={q}
            name="q"
            defaultValue={q}
            placeholder="Cari nama atau slug..."
            className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
          <button type="submit" className="bg-black px-4 py-2 text-sm font-medium text-white">
            Cari
          </button>
        </form>

        <select
          value={category}
          onChange={(e) => update({ category: e.target.value || undefined })}
          className="border border-neutral-300 px-3 py-2 text-sm"
          aria-label="Filter kategori"
        >
          <option value="">Semua kategori</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => update({ status: e.target.value === "all" ? undefined : e.target.value })}
          className="border border-neutral-300 px-3 py-2 text-sm"
          aria-label="Filter status"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {products.isLoading && <p className="text-sm text-neutral-500">Memuat produk...</p>}
      {products.isError && <p className="text-sm text-red-600">Gagal memuat produk.</p>}

      <div
        className={`overflow-x-auto border border-neutral-200 bg-white ${
          products.isPlaceholderData ? "opacity-60" : ""
        }`}
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3">Harga</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 align-middle">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-11 shrink-0 overflow-hidden bg-neutral-100">
                      {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <Link to={`/admin/products/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        {p.category.name} &middot; {p.variantCount} varian
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{formatRupiah(p.basePrice)}</td>
                <td className={`px-4 py-3 ${p.totalStock === 0 ? "font-semibold text-red-600" : ""}`}>
                  {p.totalStock}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(p, { isActive: !p.isActive })}
                      title="Klik untuk mengubah status"
                      className={`px-2 py-0.5 text-xs font-medium ${
                        p.isActive ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {p.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(p, { isFeatured: !p.isFeatured })}
                      title="Klik untuk mengubah status unggulan"
                      className={`px-2 py-0.5 text-xs font-medium ${
                        p.isFeatured ? "bg-black text-white" : "border border-neutral-300 text-neutral-500"
                      }`}
                    >
                      {p.isFeatured ? "Unggulan" : "Biasa"}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {p.isActive && (
                    <Link to={`/products/${p.slug}`} className="mr-3 text-neutral-500 underline">
                      Lihat
                    </Link>
                  )}
                  <Link to={`/admin/products/${p.id}`} className="mr-3 underline">
                    Ubah
                  </Link>
                  <button type="button" onClick={() => handleDelete(p)} className="text-red-600 underline">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!products.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Tidak ada produk yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={(next) => update({ page: next > 1 ? String(next) : undefined }, false)}
        />
      )}
    </div>
  );
}