import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteProductImage, reorderProductImages, uploadProductImages } from "../../services/admin";
import { errorText } from "../../lib/apiError";
import { invalidateCatalog } from "../../lib/invalidate";
import type { AdminImage } from "../../types";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  productId: string;
  initial: AdminImage[];
}

export default function ProductImages({ productId, initial }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<AdminImage[]>(initial);
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const previews = useMemo(
    () => pending.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [pending]
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // supaya berkas yang sama bisa dipilih lagi
    setError(null);
    setInfo(null);

    const problems: string[] = [];
    const ok: File[] = [];
    for (const file of picked) {
      if (!ALLOWED.includes(file.type)) problems.push(`"${file.name}": hanya JPEG, PNG, atau WebP.`);
      else if (file.size > MAX_BYTES) problems.push(`"${file.name}": maksimal 5 MB.`);
      else ok.push(file);
    }

    const room = Math.max(0, MAX_IMAGES - images.length - pending.length);
    if (ok.length > room) {
      problems.push(`Hanya muat ${room} gambar lagi (maksimal ${MAX_IMAGES} per produk).`);
      ok.length = room;
    }

    if (problems.length > 0) setError(problems.join(" "));
    if (ok.length > 0) setPending((current) => [...current, ...ok]);
  }

  async function upload() {
    if (pending.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const count = pending.length;
      setImages(await uploadProductImages(productId, pending));
      setPending([]);
      setInfo(`${count} gambar berhasil diunggah.`);
      invalidateCatalog(qc);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function applyOrder(next: AdminImage[]) {
    const previous = images;
    setImages(next.map((img, i) => ({ ...img, isPrimary: i === 0 }))); // tampil dulu, simpan menyusul
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      setImages(await reorderProductImages(productId, next.map((i) => i.id)));
      invalidateCatalog(qc);
    } catch (e) {
      setImages(previous);
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    void applyOrder(next);
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [image] = next.splice(index, 1);
    next.unshift(image);
    void applyOrder(next);
  }

  async function remove(image: AdminImage) {
    if (!window.confirm("Hapus gambar ini?")) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      setImages(await deleteProductImage(productId, image.id));
      invalidateCatalog(qc);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const full = images.length + pending.length >= MAX_IMAGES;

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Gambar produk</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Gambar pertama menjadi gambar utama (tampil di katalog). Disarankan foto potret rasio 4:5
          (misalnya 1200 x 1500 piksel), format JPEG, PNG, atau WebP, maksimal 5 MB per berkas, hingga{" "}
          {MAX_IMAGES} gambar. Perubahan gambar langsung tersimpan tanpa menunggu tombol simpan produk.
        </p>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-neutral-500">Belum ada gambar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="border border-neutral-200">
              <div className="relative aspect-[4/5] bg-neutral-100">
                <img src={img.url} alt={`Gambar ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 bg-black px-2 py-0.5 text-xs font-medium text-white">
                    Utama
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 text-xs">
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    aria-label="Geser ke kiri"
                    className="border border-neutral-300 px-2 py-1 disabled:opacity-30"
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={busy || i === images.length - 1}
                    aria-label="Geser ke kanan"
                    className="border border-neutral-300 px-2 py-1 disabled:opacity-30"
                  >
                    &rarr;
                  </button>
                </span>
                {i > 0 && (
                  <button type="button" onClick={() => makePrimary(i)} disabled={busy} className="underline">
                    Jadikan utama
                  </button>
                )}
                <button type="button" onClick={() => remove(img)} disabled={busy} className="text-red-600 underline">
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {previews.length > 0 && (
        <div>
          <p className="text-sm font-medium">Belum diunggah ({previews.length})</p>
          <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {previews.map((p, i) => (
              <li key={p.url} className="relative">
                <img src={p.url} alt={`Pratinjau ${p.file.name}`} className="aspect-[4/5] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPending((current) => current.filter((_, idx) => idx !== i))}
                  disabled={busy}
                  aria-label={`Batalkan ${p.file.name}`}
                  className="absolute right-1 top-1 bg-white px-1.5 text-sm leading-5 shadow"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onPick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || full}
          className="border border-black px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Pilih gambar
        </button>
        {pending.length > 0 && (
          <>
            <button
              type="button"
              onClick={upload}
              disabled={busy}
              className="bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy ? "Mengunggah..." : `Unggah ${pending.length} gambar`}
            </button>
            <button type="button" onClick={() => setPending([])} disabled={busy} className="text-sm underline">
              Batalkan pilihan
            </button>
          </>
        )}
        {full && <span className="text-xs text-neutral-500">Sudah mencapai {MAX_IMAGES} gambar.</span>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-green-700">
          {info}
        </p>
      )}
    </section>
  );
}