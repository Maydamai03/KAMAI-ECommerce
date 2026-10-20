import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const { user, register: registerUser } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await registerUser.mutateAsync({
        name: values.name,
        email: values.email,
        // Kolom kosong harus dikirim sebagai undefined, bukan string kosong
        phone: values.phone.trim() || undefined,
        password: values.password,
      });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.");
    }
  }

  const input =
    "w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Daftar</h1>
      <p className="mt-1 text-sm text-neutral-500">Buat akun untuk belanja lebih cepat.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Nama lengkap</label>
          <input
            id="name"
            autoComplete="name"
            className={input}
            {...register("name", {
              required: "Nama wajib diisi",
              minLength: { value: 2, message: "Nama minimal 2 karakter" },
            })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={input}
            {...register("email", {
              required: "Email wajib diisi",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Format email tidak valid" },
            })}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            Nomor HP <span className="font-normal text-neutral-400">(opsional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="08123456789"
            className={input}
            {...register("phone", {
              pattern: {
                value: /^(\+62|62|0)8[0-9]{7,12}$/,
                message: "Nomor HP tidak valid (contoh: 08123456789)",
              },
            })}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={input}
            {...register("password", {
              required: "Password wajib diisi",
              minLength: { value: 8, message: "Password minimal 8 karakter" },
              maxLength: { value: 72, message: "Password maksimal 72 karakter" },
            })}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Ulangi password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={input}
            {...register("confirmPassword", {
              required: "Ulangi password Anda",
              validate: (v) => v === getValues("password") || "Password tidak sama",
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-sm text-red-600">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSubmitting ? "Memproses..." : "Daftar"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Sudah punya akun?{" "}
        <Link to="/login" state={{ from }} className="font-medium underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}