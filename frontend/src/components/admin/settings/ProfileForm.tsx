import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveProfile } from "../../../services/admin";
import { errorText } from "../../../lib/apiError";
import type { StoreProfile } from "../../../types";

interface Values {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
}

const inputClass =
  "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black";
const PHONE = /^(\+62|62|0)8[0-9]{7,12}$/;

export default function ProfileForm({ profile }: { profile: StoreProfile }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      name: profile.name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      whatsapp: profile.whatsapp ?? "",
      address: profile.address ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (v: Values) => saveProfile({ ...v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
  });

  async function onSubmit(values: Values) {
    setMessage(null);
    try {
      await save.mutateAsync(values);
      setMessage({ type: "ok", text: "Profil toko disimpan." });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border border-neutral-200 bg-white p-4" noValidate>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Profil toko</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Tampil di Navbar, Footer, dan footer email ke pembeli. Kolom selain nama boleh dikosongkan.
        </p>
      </div>

      <div>
        <label htmlFor="store-name" className="mb-1 block text-sm font-medium">Nama toko</label>
        <input
          id="store-name"
          className={inputClass}
          {...register("name", {
            required: "Nama toko wajib diisi",
            minLength: { value: 2, message: "Nama minimal 2 karakter" },
          })}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="store-email" className="mb-1 block text-sm font-medium">Email</label>
          <input
            id="store-email"
            type="email"
            className={inputClass}
            {...register("email", {
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Format email tidak valid" },
            })}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="store-phone" className="mb-1 block text-sm font-medium">Telepon</label>
          <input
            id="store-phone"
            type="tel"
            placeholder="08123456789"
            className={inputClass}
            {...register("phone", { pattern: { value: PHONE, message: "Nomor tidak valid" } })}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>
        <div>
          <label htmlFor="store-wa" className="mb-1 block text-sm font-medium">WhatsApp</label>
          <input
            id="store-wa"
            type="tel"
            placeholder="08123456789"
            className={inputClass}
            {...register("whatsapp", { pattern: { value: PHONE, message: "Nomor tidak valid" } })}
          />
          {errors.whatsapp && <p className="mt-1 text-xs text-red-600">{errors.whatsapp.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="store-address" className="mb-1 block text-sm font-medium">Alamat toko</label>
        <textarea
          id="store-address"
          rows={2}
          className={inputClass}
          {...register("address", { maxLength: { value: 300, message: "Maksimal 300 karakter" } })}
        />
        {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
      </div>

      {message && (
        <p role={message.type === "error" ? "alert" : "status"} className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={save.isPending}
        className="bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {save.isPending ? "Menyimpan..." : "Simpan profil"}
      </button>
    </form>
  );
}