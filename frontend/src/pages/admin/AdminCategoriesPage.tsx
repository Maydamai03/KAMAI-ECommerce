import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} from "../../services/admin";
import { errorText } from "../../lib/apiError";
import { invalidateCatalog } from "../../lib/invalidate";
import type { AdminCategory } from "../../types";

const inputClass =
  "w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black";

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createCategory,
    onSuccess: () => invalidateCatalog(qc),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string; slug?: string } }) =>
      updateCategory(id, input),
    onSuccess: () => invalidateCatalog(qc),
  });
  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => invalidateCatalog(qc),
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), slug: slug.trim() || undefined });
      setName("");
      setSlug("");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: editing.id,
        input: { name: editing.name.trim(), slug: editing.slug.trim() || undefined },
      });
      setEditing(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function handleDelete(c: AdminCategory) {
    if (!window.confirm(`Hapus kategori "${c.name}"?`)) return;
    setError(null);
    try {
      await remove.mutateAsync(c.id);
    } catch (err) {
      setError(errorText(err));
    }
  }

  const categories = list.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kategori</h1>

      <form onSubmit={handleCreate} className="border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Tambah kategori</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori"
            className={inputClass}
            aria-label="Nama kategori"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Slug (kosongkan untuk otomatis)"
            className={inputClass}
            aria-label="Slug"
          />
          <button
            type="submit"
            disabled={create.isPending || name.trim().length < 2}
            className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {create.isPending ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {list.isLoading && <p className="text-sm text-neutral-500">Memuat kategori...</p>}
      {list.isError && <p className="text-sm text-red-600">Gagal memuat kategori.</p>}

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) =>
              editing?.id === c.id ? (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="px-4 py-2">
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className={inputClass}
                      aria-label="Nama kategori"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={editing.slug}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                      className={inputClass}
                      aria-label="Slug"
                    />
                  </td>
                  <td className="px-4 py-2">{c.productCount}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={update.isPending}
                      className="mr-3 font-medium underline"
                    >
                      Simpan
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="text-neutral-500 underline">
                      Batal
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.slug}</td>
                  <td className="px-4 py-3">{c.productCount}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug })}
                      className="mr-3 underline"
                    >
                      Ubah
                    </button>
                    <button type="button" onClick={() => handleDelete(c)} className="text-red-600 underline">
                      Hapus
                    </button>
                  </td>
                </tr>
              )
            )}
            {!list.isLoading && categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  Belum ada kategori.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}