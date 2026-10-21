import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { getOrder } from "../services/orders";
import { ApiError } from "../lib/api";
import { formatDateTime, formatRupiah } from "../lib/format";
import { forgetOrderEmail, recallOrderEmail, rememberOrderEmail } from "../lib/orderEmail";
import type { OrderStatus } from "../types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Sudah dibayar",
  PROCESSING: "Sedang diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrderPage() {
  const { orderNumber = "" } = useParams();
  const location = useLocation();
  const justCreated = Boolean(
    (location.state as { justCreated?: boolean } | null)?.justCreated
  );

  const { user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState<string | null>(() => recallOrderEmail(orderNumber));
  const [emailInput, setEmailInput] = useState("");

  const order = useQuery({
    queryKey: ["order", orderNumber, user?.id ?? null, email],
    queryFn: () => getOrder(orderNumber, email ?? undefined),
    enabled: !authLoading && (Boolean(user) || Boolean(email)),
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 404) && count < 1,
  });

  const notFound = order.error instanceof ApiError && order.error.status === 404;
  const showEmailForm = !authLoading && !email && (!user || notFound);

  function submitEmail(e: FormEvent) {
    e.preventDefault();
    const value = emailInput.trim();
    if (!value) return;
    rememberOrderEmail(orderNumber, value);
    setEmail(value);
  }

  if (authLoading || (order.isLoading && !showEmailForm)) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-neutral-500">Memuat pesanan...</div>;
  }

  if (showEmailForm) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold">Lihat Pesanan</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Masukkan email yang dipakai saat memesan untuk membuka pesanan {orderNumber}.
        </p>
        <form onSubmit={submitEmail} className="mt-6 space-y-3">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="email@contoh.com"
            autoComplete="email"
            className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
          />
          <button type="submit" className="w-full bg-black px-6 py-3 text-sm font-semibold text-white">
            Tampilkan pesanan
          </button>
        </form>
        {!user && (
          <p className="mt-4 text-sm text-neutral-600">
            Atau{" "}
            <Link to="/login" state={{ from: `/orders/${orderNumber}` }} className="font-medium underline">
              masuk
            </Link>{" "}
            jika pesanan dibuat dengan akunmu.
          </p>
        )}
      </div>
    );
  }

  if (order.isError || !order.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">
          {notFound ? "Pesanan tidak ditemukan" : "Gagal memuat pesanan"}
        </h1>
        {notFound && (
          <p className="mt-2 text-sm text-neutral-600">
            Periksa nomor pesanan dan email, atau masuk dengan akun yang dipakai saat memesan.
          </p>
        )}
        {notFound && email && (
          <button
            type="button"
            onClick={() => {
              forgetOrderEmail(orderNumber);
              setEmail(null);
            }}
            className="mt-4 text-sm underline"
          >
            Gunakan email lain
          </button>
        )}
        <div>
          <Link to="/" className="mt-4 inline-block text-sm underline">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const o = order.data;
  const a = o.shippingAddress;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {justCreated && (
        <div className="mb-6 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
          Pesanan berhasil dibuat. Simpan nomor pesananmu.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">Nomor pesanan</p>
          <h1 className="text-2xl font-bold">{o.orderNumber}</h1>
        </div>
        <span className={`px-3 py-1 text-sm font-medium ${STATUS_STYLE[o.status]}`}>
          {STATUS_LABEL[o.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">Dibuat {formatDateTime(o.createdAt)}</p>

      {o.status === "PENDING" && (
        <div className="mt-6 border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-medium">Selesaikan pembayaran sebelum {formatDateTime(o.expiresAt)}.</p>
          <p className="mt-1">Pembayaran online akan diaktifkan di tahap berikutnya.</p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Produk</h2>
        <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>
                {i.productName}
                <span className="block text-xs text-neutral-500">
                  {i.variantLabel} &times; {i.quantity} @ {formatRupiah(i.unitPrice)}
                </span>
              </span>
              <span>{formatRupiah(i.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(o.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkos kirim</span>
            <span>{formatRupiah(o.shippingCost)}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(o.total)}</span>
          </div>
        </div>
      </section>

      <section className="mt-8 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Dikirim ke</h2>
        <p className="mt-3 font-medium">
          {a.recipientName} &middot; {a.phone}
        </p>
        {o.email && <p className="text-neutral-500">{o.email}</p>}
        <p className="mt-2">{a.street}</p>
        <p className="text-neutral-600">
          {a.district}, {a.city}, {a.province} {a.postalCode}
        </p>
        {a.note && <p className="mt-1 text-xs text-neutral-500">Catatan: {a.note}</p>}
      </section>

      <Link to="/products" className="mt-10 inline-block text-sm underline">
        Lanjut belanja
      </Link>
    </div>
  );
}