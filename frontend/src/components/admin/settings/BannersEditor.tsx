import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBanner, deleteBanner, getAdminBanners, saveBanners } from "../../../services/admin";
import { errorText } from "../../../lib/apiError";
import type { AdminBanner } from "../../../types";

const MAX_BANNERS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const LINK_OK = /^(\/(?![\/\\])[^\s\\]*|https?:\/\/[^\s\\]+)$/i;

interface Row {
  id: string;
  url: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  linkUrl: string;
  isActive: boolean;
}

const EMPTY_FORM = { title: "", subtitle: "", buttonLabel: "", linkUrl: "" };

const toRows = (list: AdminBanner[]): Row[] =>
  list.map((b) => ({
    id: b.id,
    url: b.url,
    title: b.title ?? "",
    subtitle: b.subtitle ?? "",
    buttonLabel: b.buttonLabel ?? "",
    linkUrl: b.linkUrl ?? "",
    isActive: b.isActive,
  }));

function linkProblem(buttonLabel: string, linkUrl: string): string | null {
  const label = buttonLabel.trim();
  const link = linkUrl.trim();
  if (link && !LINK_OK.test(link)) {
    return "Tautan harus berupa alamat internal (diawali /, mis. /products) atau URL lengkap (https://...).";
  }
  if (link && !label) return "Teks tombol wajib diisi jika tautan diisi.";
  if (label && !link) return "Tautan wajib diisi jika teks tombol diisi.";
  return null;
}

const inputClass =
  "w-full border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-black";

export default function BannersEditor() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-banners"], queryFn: getAdminBanners, staleTime: 0 });

  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (list.data) setRows(toRows(list.data));
  }, [list.data]);

  const saved = useMemo(() => (list.data ? toRows(list.data) : []), [list.data]);
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);

  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function applyServer(data: AdminBanner[]) {
    qc.setQueryData(["admin-banners"], data);
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  const add = useMutation({ mutationFn: createBanner, onSuccess: applyServer });
  const save = useMutation({ mutationFn: saveBanners, onSuccess: applyServer });
  const remove = useMutation({ mutationFn: deleteBanner, onSuccess: applyServer });
  const busy = add.isPending || save.isPending || remove.isPending;

  function pickFile(f: File | null) {
    setMessage(null);
    if (!f) return setFile(null);
    if (!ALLOWED.includes(f.type)) {
      setMessage({ type: "error", text: "Hanya JPEG, PNG, atau WebP." });
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      setMessage({ type: "error", text: "Ukuran gambar maksimal 5 MB." });
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(f);
  }

  async function submitNew() {
    setMessage(null);
    if (dirty) return setMessage({ type: "error", text: "Simpan atau batalkan perubahan banner dulu sebelum menambah." });
    if (!file) return setMessage({ type: "error", text: "Pilih gambar banner." });
    const problem = linkProblem(form.buttonLabel, form.linkUrl);
    if (problem) return setMessage({ type: "error", text: problem });

    const body = new FormData();
    body.append("image", file);
    for (const [key, value] of Object.entries(form)) {
      if (value.trim()) body.append(key, value.trim());
    }

    try {
      await add.mutateAsync(body);
      setFile(null);
      setForm(EMPTY_FORM);
      if (fileInput.current) fileInput.current.value = "";
      setMessage({ type: "ok", text: "Banner ditambahkan dan langsung tampil di beranda." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  async function submitSave() {
    setMessage(null);
    for (let i = 0; i < rows.length; i++) {
      const problem = linkProblem(rows[i].buttonLabel, rows[i].linkUrl);
      if (problem) return setMessage({ type: "error", text: `Banner ${i + 1}: ${problem}` });
    }
    try {
      await save.mutateAsync(
        rows.map((r) => ({
          id: r.id,
          isActive: r.isActive,
          title: r.title.trim(),
          subtitle: r.subtitle.trim(),
          buttonLabel: r.buttonLabel.trim(),
          linkUrl: r.linkUrl.trim(),
        }))
      );
      setMessage({ type: "ok", text: "Perubahan banner disimpan." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  async function submitDelete(row: Row, index: number) {
    setMessage(null);
    if (dirty) return setMessage({ type: "error", text: "Simpan atau batalkan perubahan banner dulu sebelum menghapus." });
    if (!window.confirm(`Hapus banner ${index + 1}? Gambarnya juga dihapus dari penyimpanan.`)) return;
    try {
      await remove.mutateAsync(row.id);
      setMessage({ type: "ok", text: "Banner dihapus." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  function patch(id: string, change: Partial<Row>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setRows((cur) => {
      const next = [...cur];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const activeCount = rows.filter((r) => r.isActive).length;

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Banner beranda</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Gambar besar di bagian atas beranda (carousel). Disarankan 1920 x 800 piksel (rasio sekitar 21:9),
          JPEG, PNG, atau WebP, maksimal 5 MB. Letakkan objek penting di tengah karena di HP gambar dipotong ke
          tengah. Tanpa banner aktif, beranda menampilkan tampilan teks bawaan. Maksimal {MAX_BANNERS} banner.
        </p>
      </div>

      {/* Tambah */}
      <div className="space-y-3 border border-dashed border-neutral-300 p-3">
        <p className="text-sm font-medium">Tambah banner</p>

        {preview && (
          <img src={preview} alt="Pratinjau banner" className="aspect-[21/9] w-full max-w-md object-cover" />
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="block text-sm"
          aria-label="Pilih gambar banner"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Judul (opsional)"
            maxLength={80}
            className={inputClass}
            aria-label="Judul"
          />
          <input
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Teks pendukung (opsional)"
            maxLength={160}
            className={inputClass}
            aria-label="Teks pendukung"
          />
          <input
            value={form.buttonLabel}
            onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
            placeholder="Teks tombol, mis. Belanja Sekarang"
            maxLength={30}
            className={inputClass}
            aria-label="Teks tombol"
          />
          <input
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            placeholder="Tautan tombol, mis. /products"
            maxLength={300}
            className={inputClass}
            aria-label="Tautan tombol"
          />
        </div>

        <button
          type="button"
          onClick={submitNew}
          disabled={busy || rows.length >= MAX_BANNERS}
          className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          {add.isPending ? "Mengunggah..." : "Tambah banner"}
        </button>
        {rows.length >= MAX_BANNERS && (
          <p className="text-xs text-neutral-500">Sudah mencapai {MAX_BANNERS} banner. Hapus salah satu untuk menambah.</p>
        )}
      </div>

      {list.isLoading && <p className="text-sm text-neutral-500">Memuat banner...</p>}
      {list.isError && <p className="text-sm text-red-600">Gagal memuat banner.</p>}

      {/* Daftar */}
      {rows.length > 0 && (
        <>
          <p className="text-xs text-neutral-500">
            {activeCount} dari {rows.length} banner aktif dan tampil di beranda sesuai urutan.
          </p>

          <ul className="space-y-4">
            {rows.map((r, i) => (
              <li key={r.id} className="grid gap-3 border border-neutral-200 p-3 sm:grid-cols-[220px_1fr]">
                <div>
                  <div className={`relative aspect-[21/9] bg-neutral-100 ${r.isActive ? "" : "opacity-50"}`}>
                    <img src={r.url} alt={`Banner ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 bg-black px-2 py-0.5 text-xs text-white">{i + 1}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={busy || i === 0}
                      aria-label="Naikkan urutan"
                      className="border border-neutral-300 px-2 py-1 disabled:opacity-30"
                    >
                      &uarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={busy || i === rows.length - 1}
                      aria-label="Turunkan urutan"
                      className="border border-neutral-300 px-2 py-1 disabled:opacity-30"
                    >
                      &darr;
                    </button>
                    <button
                      type="button"
                      onClick={() => submitDelete(r, i)}
                      disabled={busy}
                      className="ml-auto text-red-600 underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) => patch(r.id, { isActive: e.target.checked })}
                    />
                    Tampilkan di beranda
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={r.title}
                      onChange={(e) => patch(r.id, { title: e.target.value })}
                      placeholder="Judul"
                      maxLength={80}
                      className={inputClass}
                      aria-label={`Judul banner ${i + 1}`}
                    />
                    <input
                      value={r.subtitle}
                      onChange={(e) => patch(r.id, { subtitle: e.target.value })}
                      placeholder="Teks pendukung"
                      maxLength={160}
                      className={inputClass}
                      aria-label={`Teks pendukung banner ${i + 1}`}
                    />
                    <input
                      value={r.buttonLabel}
                      onChange={(e) => patch(r.id, { buttonLabel: e.target.value })}
                      placeholder="Teks tombol"
                      maxLength={30}
                      className={inputClass}
                      aria-label={`Teks tombol banner ${i + 1}`}
                    />
                    <input
                      value={r.linkUrl}
                      onChange={(e) => patch(r.id, { linkUrl: e.target.value })}
                      placeholder="Tautan (mis. /products)"
                      maxLength={300}
                      className={inputClass}
                      aria-label={`Tautan banner ${i + 1}`}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitSave}
              disabled={busy || !dirty}
              className="bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              {save.isPending ? "Menyimpan..." : "Simpan perubahan banner"}
            </button>
            <button
              type="button"
              onClick={() => setRows(saved)}
              disabled={busy || !dirty}
              className="border border-neutral-300 px-6 py-2 text-sm hover:border-black disabled:opacity-40"
            >
              Batalkan perubahan
            </button>
            {dirty && <span className="text-xs text-orange-700">Ada perubahan yang belum disimpan.</span>}
          </div>
        </>
      )}

      {!list.isLoading && rows.length === 0 && (
        <p className="text-sm text-neutral-500">Belum ada banner. Beranda memakai tampilan teks bawaan.</p>
      )}

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}