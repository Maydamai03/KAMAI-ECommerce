import { useState } from "react";
import { useForm } from "react-hook-form";
import { changePassword } from "../services/auth";
import { errorText } from "../lib/apiError";

interface Values {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const inputClass =
  "w-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black";

export default function ChangePasswordForm() {
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>();

  async function onSubmit(values: Values) {
    setMessage(null);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      setMessage({
        type: "ok",
        text: "Password diperbarui. Perangkat lain yang masih login otomatis dikeluarkan.",
      });
    } catch (e) {
      setMessage({ type: "error", text: errorText(e) });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm font-medium">
          Password saat ini
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          {...register("currentPassword", { required: "Password saat ini wajib diisi" })}
        />
        {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
          Password baru
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...register("newPassword", {
            required: "Password baru wajib diisi",
            minLength: { value: 8, message: "Password baru minimal 8 karakter" },
            maxLength: { value: 72, message: "Password baru maksimal 72 karakter" },
          })}
        />
        {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
          Ulangi password baru
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass}
          {...register("confirmPassword", {
            required: "Ulangi password baru",
            validate: (v) => v === getValues("newPassword") || "Password tidak sama",
          })}
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isSubmitting ? "Menyimpan..." : "Ubah password"}
      </button>
    </form>
  );
}