import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeLogo, uploadLogo } from "../../../services/admin";
import { errorText } from "../../../lib/apiError";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function LogoEditor({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["store"] });
  }

  const upload = useMutation({ mutationFn: uploadLogo, onSuccess: refresh });
  const remove = useMutation({ mutationFn: removeLogo, onSuccess: refresh });
  const busy = upload.isPending || remove.isPending;

  function pick(f: File | null) {
    setMessage(null);
    if (!f) return setFile(null);
    if (!ALLOWED.includes(f.type)) {
      setMessage({ type: "error", text: "Hanya JPEG, PNG, atau WebP." });
      if (input.current) input.current.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      setMessage({ type: "error", text: "Ukuran gambar maksimal 5 MB." });
      if (input.current) input.current.value = "";
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setMessage(null);
    const body = new FormData();
    body.append("logo", file);
    try {
      await upload.mutateAsync(body);
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage({ type: "ok", text: "Logo disimpan dan langsung tampil di toko." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  async function doRemove() {
    if (!window.confirm("Hapus logo? Navbar akan kembali menampilkan nama toko sebagai teks.")) return;
    setMessage(null);
    try {
      await remove.mutateAsync();
      setMessage({ type: "ok", text: "Logo dihapus." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  const shown = preview ?? logoUrl;

  return (
    <section className="space-y-4 border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Logo toko</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Tampil di tengah Navbar. Disarankan PNG atau WebP berlatar transparan, tinggi sekitar 80 sampai 120
          piksel dan lebar tidak lebih dari 400 piksel (ditampilkan setinggi sekitar 36 piksel). Kalau logo
          kosong, nama toko tampil sebagai teks.
        </p>
      </div>

      <div className="flex min-h-20 items-center justify-center border border-neutral-200 bg-neutral-50 p-4">
        {shown ? (
          <img src={shown} alt={`Logo ${name}`} className="h-12 w-auto max-w-[260px] object-contain" />
        ) : (
          <span className="text-xl font-bold uppercase tracking-[0.22em]">{name}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block text-sm"
          aria-label="Pilih gambar logo"
        />
        {file && (
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {upload.isPending ? "Mengunggah..." : "Simpan logo"}
          </button>
        )}
        {logoUrl && !file && (
          <button type="button" onClick={doRemove} disabled={busy} className="text-sm text-red-600 underline">
            Hapus logo
          </button>
        )}
      </div>

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