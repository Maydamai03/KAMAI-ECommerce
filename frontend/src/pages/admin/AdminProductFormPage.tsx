import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  getAdminCategories,
  getAdminProduct,
  updateProduct,
} from "../../services/admin";
import { errorText } from "../../lib/apiError";
import { invalidateCatalog } from "../../lib/invalidate";
import type { AdminCategory, AdminProductDetail, AdminProductInput } from "../../types";

interface VariantRow {
  key: string;
  id?: string;
  color: string;
  size: string;
  sku: string;
  stock: string;
  expectedStock?: number;
  priceOverride: string;
  isActive: boolean;
  orderCount: number;
}

interface FormValues {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  basePrice: string;
  weightGram: string;
  isActive: boolean;
  isFeatured: boolean;
}

let rowSeq = 0;
const nextKey = () => `row-${++rowSeq}`;

const inputClass =
  "w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black";
const cellClass =
  "w-full border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-black";

function ProductForm({
  product,
  categories,
}: {
  product?: AdminProductDetail;
  categories: AdminCategory[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          basePrice: String(product.basePrice),
          weightGram: String(product.weightGram),
          isActive: product.isActive,
          isFeatured: product.isFeatured,
        }
      : {
          name: "",
          slug: "",
          description: "",
          categoryId: "",
          basePrice: "",
          weightGram: "500",
          isActive: true,
          isFeatured: false,
        },
  });

  const [rows, setRows] = useState<VariantRow[]>(() =>
    product
      ? product.variants.map((v) => ({
          key: nextKey(),
          id: v.id,
          color: v.color,
          size: v.size,
          sku: v.sku,
          stock: String(v.stock),
          expectedStock: v.stock,
          priceOverride: v.priceOverride === null ? "" : String(v.priceOverride),
          isActive: v.isActive,
          orderCount: v.orderCount,
        }))
      : []
  );
  const [gen, setGen] = useState({ colors: "", sizes: "", stock: "5" });
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (payload: AdminProductInput) =>
      product ? updateProduct(product.id, payload) : createProduct(payload),
  });

  function patchRow(key: string, patch: Partial<VariantRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { key: nextKey(), color: "", size: "", sku: "", stock: "0", priceOverride: "", isActive: true, orderCount: 0 },
    ]);
  }

  function generate() {
    const colors = [...new Set(gen.colors.split(",").map((s) => s.trim()).filter(Boolean))];
    const sizes = [...new Set(gen.sizes.split(",").map((s) => s.trim()).filter(Boolean))];
    if (colors.length === 0 || sizes.length === 0) return;

    setRows((current) => {
      const have = new Set(current.map((r) => `${r.color.trim().toLowerCase()}|${r.size.trim().toLowerCase()}`));
      const added: VariantRow[] = [];
      for (const color of colors) {
        for (const size of sizes) {
          const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
          if (have.has(key)) continue;
          have.add(key);
          added.push({
            key: nextKey(),
            color,
            size,
            sku: "",
            stock: /^\d+$/.test(gen.stock) ? gen.stock : "0",
            priceOverride: "",
            isActive: true,
            orderCount: 0,
          });
        }
      }
      return [...current, ...added];
    });
    setGen({ ...gen, colors: "", sizes: "" });
  }

  function validateRows(isActive: boolean): string[] {
    const problems: string[] = [];
    const seen = new Set<string>();

    if (isActive && rows.length === 0) {
      problems.push("Produk aktif membutuhkan minimal satu varian.");
    }

    rows.forEach((r, i) => {
      const label = `Varian ${i + 1}`;
      if (!r.color.trim()) problems.push(`${label}: warna wajib diisi.`);
      if (!r.size.trim()) problems.push(`${label}: ukuran wajib diisi.`);
      if (!/^\d+$/.test(r.stock.trim())) problems.push(`${label}: stok harus bilangan bulat 0 atau lebih.`);
      if (r.priceOverride.trim() && !/^[1-9]\d*$/.test(r.priceOverride.trim())) {
        problems.push(`${label}: harga khusus harus angka lebih dari 0.`);
      }
      const key = `${r.color.trim().toLowerCase()}|${r.size.trim().toLowerCase()}`;
      if (r.color.trim() && r.size.trim()) {
        if (seen.has(key)) problems.push(`${label}: ${r.color.trim()} / ${r.size.trim()} sudah ada.`);
        seen.add(key);
      }
    });
    return problems;
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const problems = validateRows(values.isActive);
    setRowErrors(problems);
    if (problems.length > 0) return;

    const payload: AdminProductInput = {
      name: values.name.trim(),
      slug: values.slug.trim() || undefined,
      description: values.description.trim(),
      categoryId: values.categoryId,
      basePrice: Number(values.basePrice),
      weightGram: Number(values.weightGram),
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      variants: rows.map((r) => ({
        id: r.id,
        color: r.color.trim(),
        size: r.size.trim(),
        sku: r.sku.trim() || undefined,
        stock: Number(r.stock),
        expectedStock: r.id ? r.expectedStock : undefined,
        priceOverride: r.priceOverride.trim() ? Number(r.priceOverride) : null,
        isActive: r.isActive,
      })),
    };

    try {
      const result = await save.mutateAsync(payload);
      invalidateCatalog(qc);
      navigate("/admin/products", {
        state: {
          notice: {
            text: product ? `Produk "${result.product.name}" diperbarui.` : `Produk "${result.product.name}" ditambahkan.`,
            warnings: result.warnings,
          },
        },
      });
    } catch (e) {
      setFormError(errorText(e));
    }
  }

  const numberPattern = {
    value: /^\d+$/,
    message: "Harus berupa angka bulat",
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{product ? "Ubah produk" : "Tambah produk"}</h1>
        <Link to="/admin/products" className="text-sm underline">
          Kembali ke daftar
        </Link>
      </div>

      <section className="space-y-4 border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Informasi produk</h2>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Nama produk</label>
          <input
            id="name"
            className={inputClass}
            {...register("name", {
              required: "Nama produk wajib diisi",
              minLength: { value: 2, message: "Nama minimal 2 karakter" },
            })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium">
            Slug <span className="font-normal text-neutral-400">(alamat halaman produk)</span>
          </label>
          <input
            id="slug"
            placeholder="kosongkan untuk dibuat otomatis dari nama"
            className={inputClass}
            {...register("slug", {
              pattern: {
                value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: "Hanya huruf kecil, angka, dan tanda hubung",
              },
            })}
          />
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
          {product && (
            <p className="mt-1 text-xs text-neutral-500">
              Mengubah slug akan mengubah alamat halaman produk; tautan lama tidak lagi berlaku.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">Deskripsi</label>
          <textarea
            id="description"
            rows={5}
            className={inputClass}
            {...register("description", { required: "Deskripsi wajib diisi" })}
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="categoryId" className="mb-1 block text-sm font-medium">Kategori</label>
            <select
              id="categoryId"
              className={inputClass}
              {...register("categoryId", { required: "Pilih kategori" })}
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
          </div>

          <div>
            <label htmlFor="basePrice" className="mb-1 block text-sm font-medium">Harga dasar (Rp)</label>
            <input
              id="basePrice"
              inputMode="numeric"
              className={inputClass}
              {...register("basePrice", {
                required: "Harga wajib diisi",
                pattern: numberPattern,
                validate: (v) => Number(v) >= 1 || "Harga minimal 1",
              })}
            />
            {errors.basePrice && <p className="mt-1 text-xs text-red-600">{errors.basePrice.message}</p>}
          </div>

          <div>
            <label htmlFor="weightGram" className="mb-1 block text-sm font-medium">Berat (gram)</label>
            <input
              id="weightGram"
              inputMode="numeric"
              className={inputClass}
              {...register("weightGram", {
                required: "Berat wajib diisi",
                pattern: numberPattern,
                validate: (v) => Number(v) >= 1 || "Berat minimal 1 gram",
              })}
            />
            {errors.weightGram && <p className="mt-1 text-xs text-red-600">{errors.weightGram.message}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("isActive")} />
            Aktif (tampil di toko)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("isFeatured")} />
            Produk unggulan (tampil di beranda)
          </label>
        </div>
      </section>

      <section className="space-y-4 border border-neutral-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">Gambar</h2>
          {product && product.images.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.images.map((img) => (
                <img key={img.id} src={img.url} alt="" className="h-24 w-20 object-cover" />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">Belum ada gambar.</p>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Unggah dan atur gambar produk tersedia di tahap berikutnya.
          </p>
        </div>
      </section>

      <section className="space-y-4 border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Varian dan stok</h2>

        <div className="border border-dashed border-neutral-300 p-3">
          <p className="text-sm font-medium">Buat banyak varian sekaligus</p>
          <p className="text-xs text-neutral-500">
            Pisahkan dengan koma. Contoh: warna <em>Hitam, Putih</em> dan ukuran <em>S, M, L, XL</em>{" "}
            menghasilkan 8 varian. Kombinasi yang sudah ada dilewati.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
            <input
              value={gen.colors}
              onChange={(e) => setGen({ ...gen, colors: e.target.value })}
              placeholder="Warna: Hitam, Putih"
              className={cellClass}
              aria-label="Daftar warna"
            />
            <input
              value={gen.sizes}
              onChange={(e) => setGen({ ...gen, sizes: e.target.value })}
              placeholder="Ukuran: S, M, L, XL"
              className={cellClass}
              aria-label="Daftar ukuran"
            />
            <input
              value={gen.stock}
              onChange={(e) => setGen({ ...gen, stock: e.target.value })}
              placeholder="Stok awal"
              inputMode="numeric"
              className={cellClass}
              aria-label="Stok awal"
            />
            <button type="button" onClick={generate} className="border border-black px-4 py-1.5 text-sm font-medium">
              Buat
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="pb-2 pr-2">Warna</th>
                <th className="pb-2 pr-2">Ukuran</th>
                <th className="pb-2 pr-2">SKU</th>
                <th className="pb-2 pr-2">Stok</th>
                <th className="pb-2 pr-2">Harga khusus</th>
                <th className="pb-2 pr-2">Aktif</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-neutral-200 align-top">
                  <td className="py-2 pr-2">
                    <input
                      value={r.color}
                      onChange={(e) => patchRow(r.key, { color: e.target.value })}
                      className={cellClass}
                      aria-label="Warna"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={r.size}
                      onChange={(e) => patchRow(r.key, { size: e.target.value })}
                      className={cellClass}
                      aria-label="Ukuran"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={r.sku}
                      onChange={(e) => patchRow(r.key, { sku: e.target.value })}
                      placeholder="otomatis"
                      className={cellClass}
                      aria-label="SKU"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={r.stock}
                      onChange={(e) => patchRow(r.key, { stock: e.target.value })}
                      inputMode="numeric"
                      className={cellClass}
                      aria-label="Stok"
                    />
                    {r.id && r.expectedStock !== undefined && String(r.expectedStock) !== r.stock.trim() && (
                      <span className="mt-1 block text-xs text-orange-600">dari {r.expectedStock}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={r.priceOverride}
                      onChange={(e) => patchRow(r.key, { priceOverride: e.target.value })}
                      inputMode="numeric"
                      placeholder="harga dasar"
                      className={cellClass}
                      aria-label="Harga khusus"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) => patchRow(r.key, { isActive: e.target.checked })}
                      aria-label="Varian aktif"
                      className="mt-2"
                    />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setRows((current) => current.filter((x) => x.key !== r.key))}
                      className="text-red-600 underline"
                      title={
                        r.orderCount > 0
                          ? "Varian ini pernah dipesan, jadi hanya akan dinonaktifkan"
                          : "Hapus varian"
                      }
                    >
                      Hapus
                    </button>
                    {r.orderCount > 0 && (
                      <span className="mt-1 block text-xs text-neutral-500">dipesan {r.orderCount}&times;</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-neutral-500">
                    Belum ada varian. Tambahkan satu atau buat sekaligus di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addRow} className="text-sm underline">
          + Tambah varian
        </button>
        <p className="text-xs text-neutral-500">
          SKU yang dikosongkan dibuat otomatis. Harga khusus yang dikosongkan memakai harga dasar. Stok
          hanya perlu diubah kalau memang ingin mengoreksinya.
        </p>

        {rowErrors.length > 0 && (
          <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-red-600">
            {rowErrors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </section>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={save.isPending}
          className="bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {save.isPending ? "Menyimpan..." : product ? "Simpan perubahan" : "Simpan produk"}
        </button>
        <Link to="/admin/products" className="border border-neutral-300 px-6 py-3 text-sm hover:border-black">
          Batal
        </Link>
      </div>
    </form>
  );
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });
  const product = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => getAdminProduct(id as string),
    enabled: isEdit,
    // Selalu muat data terbaru; stok yang basi berbahaya untuk pengaman edit bersamaan
    gcTime: 0,
    staleTime: 0,
  });

  if (categories.isLoading || (isEdit && product.isLoading)) {
    return <p className="text-sm text-neutral-500">Memuat...</p>;
  }

  if (categories.isError || (isEdit && (product.isError || !product.data))) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-red-600">Gagal memuat data. Produk mungkin sudah dihapus.</p>
        <Link to="/admin/products" className="underline">
          Kembali ke daftar produk
        </Link>
      </div>
    );
  }

  if (categories.data && categories.data.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <p>Belum ada kategori. Buat kategori terlebih dahulu sebelum menambah produk.</p>
        <Link to="/admin/categories" className="underline">
          Buka halaman kategori
        </Link>
      </div>
    );
  }

  return (
    <ProductForm
      key={product.data?.id ?? "new"}
      product={product.data}
      categories={categories.data ?? []}
    />
  );
}