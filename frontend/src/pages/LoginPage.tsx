import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { usePrivatePage } from "../hooks/usePageMeta";

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  usePrivatePage("Masuk");
  const { user, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  // Sudah login (termasuk setelah login berhasil): arahkan pergi
  if (user) return <Navigate to={from} replace />;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await login.mutateAsync(values);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Terjadi kesalahan. Coba lagi.");
    }
  }

  const input =
    "w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Masuk</h1>
      <p className="mt-1 text-sm text-neutral-500">Masuk untuk melihat pesanan dan menyimpan alamat.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
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
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={input}
            {...register("password", { required: "Password wajib diisi" })}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        {serverError && (
          <p role="alert" className="text-sm text-red-600">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Belum punya akun?{" "}
        <Link to="/register" state={{ from }} className="font-medium underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}