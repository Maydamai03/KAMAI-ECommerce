import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "../lib/api";
import type { AddressFormValues } from "../types";

interface Props {
  defaultValues?: Partial<AddressFormValues>;
  withEmail?: boolean;
  showDefault?: boolean;
  submitLabel: string;
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel?: () => void;
}

const inputClass =
  "w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black";

function Field({
  label,
  htmlFor,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-neutral-400"> (opsional)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function AddressForm({
  defaultValues,
  withEmail,
  showDefault,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    defaultValues: {
      recipientName: "",
      phone: "",
      province: "",
      city: "",
      district: "",
      postalCode: "",
      street: "",
      note: "",
      isDefault: false,
      email: "",
      ...defaultValues,
    },
  });

  async function submit(values: AddressFormValues) {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {withEmail && (
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register("email", {
              required: "Email wajib diisi",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Format email tidak valid" },
            })}
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama penerima" htmlFor="recipientName" error={errors.recipientName?.message}>
          <input
            id="recipientName"
            autoComplete="name"
            className={inputClass}
            {...register("recipientName", {
              required: "Nama penerima wajib diisi",
              minLength: { value: 2, message: "Nama minimal 2 karakter" },
            })}
          />
        </Field>

        <Field label="Nomor HP" htmlFor="phone" error={errors.phone?.message}>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="08123456789"
            className={inputClass}
            {...register("phone", {
              required: "Nomor HP wajib diisi",
              pattern: {
                value: /^(\+62|62|0)8[0-9]{7,12}$/,
                message: "Nomor HP tidak valid (contoh: 08123456789)",
              },
            })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Provinsi" htmlFor="province" error={errors.province?.message}>
          <input
            id="province"
            className={inputClass}
            {...register("province", { required: "Provinsi wajib diisi" })}
          />
        </Field>

        <Field label="Kota/Kabupaten" htmlFor="city" error={errors.city?.message}>
          <input
            id="city"
            className={inputClass}
            {...register("city", { required: "Kota wajib diisi" })}
          />
        </Field>

        <Field label="Kecamatan" htmlFor="district" error={errors.district?.message}>
          <input
            id="district"
            className={inputClass}
            {...register("district", { required: "Kecamatan wajib diisi" })}
          />
        </Field>

        <Field label="Kode pos" htmlFor="postalCode" error={errors.postalCode?.message}>
          <input
            id="postalCode"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            className={inputClass}
            {...register("postalCode", {
              required: "Kode pos wajib diisi",
              pattern: { value: /^\d{5}$/, message: "Kode pos harus 5 digit" },
            })}
          />
        </Field>
      </div>

      <Field label="Alamat lengkap" htmlFor="street" error={errors.street?.message}>
        <textarea
          id="street"
          rows={3}
          autoComplete="street-address"
          placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
          className={inputClass}
          {...register("street", {
            required: "Alamat wajib diisi",
            minLength: { value: 5, message: "Alamat minimal 5 karakter" },
          })}
        />
      </Field>

      <Field label="Catatan untuk kurir" htmlFor="note" optional error={errors.note?.message}>
        <input
          id="note"
          className={inputClass}
          {...register("note", { maxLength: { value: 200, message: "Maksimal 200 karakter" } })}
        />
      </Field>

      {showDefault && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isDefault")} />
          Jadikan alamat utama
        </label>
      )}

      {serverError && (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSubmitting ? "Menyimpan..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-neutral-300 px-6 py-3 text-sm hover:border-black"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}