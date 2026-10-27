import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { getOrder, payOrder, syncOrder } from "../services/orders";
import { loadSnap } from "../lib/snap";
import { ApiError } from "../lib/api";
import { formatDateTime, formatRupiah } from "../lib/format";
import { forgetOrderEmail, recallOrderEmail, rememberOrderEmail } from "../lib/orderEmail";
import { STATUS_LABEL, STATUS_STYLE } from "../lib/orderStatus";

// const STATUS_LABEL: Record<OrderStatus, string> = {
//   PENDING: "Menunggu pembayaran",
//   PAID: "Sudah dibayar",
//   PROCESSING: "Sedang diproses",
//   SHIPPED: "Dikirim",
//   COMPLETED: "Selesai",
//   EXPIRED: "Kedaluwarsa",
//   CANCELLED: "Dibatalkan",
// };

// const STATUS_STYLE: Record<OrderStatus, string> = {
//   PENDING: "bg-orange-100 text-orange-800",
//   PAID: "bg-green-100 text-green-800",
//   PROCESSING: "bg-blue-100 text-blue-800",
//   SHIPPED: "bg-blue-100 text-blue-800",
//   COMPLETED: "bg-green-100 text-green-800",
//   EXPIRED: "bg-neutral-200 text-neutral-700",
//   CANCELLED: "bg-red-100 text-red-800",
// };

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
    const queryClient = useQueryClient();
  const [payError, setPayError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  const pay = useMutation({ mutationFn: () => payOrder(orderNumber, email ?? undefined) });

  const sync = useMutation({
    mutationFn: () => syncOrder(orderNumber, email ?? undefined),
    onSuccess: (data) => {
      queryClient.setQueryData(["order", orderNumber, user?.id ?? null, email], data);
    },
  });

  // Setelah pembayaran dimulai, cek status setiap 5 detik (maks. 3 menit)
  const currentStatus = order.data?.status;
  useEffect(() => {
    if (!watching || currentStatus !== "PENDING") return;
    const interval = setInterval(() => sync.mutate(), 5000);
    const stop = setTimeout(() => setWatching(false), 3 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching, currentStatus]);

  async function handlePay() {
    setPayError(null);
    try {
      const [{ token }] = await Promise.all([pay.mutateAsync(), loadSnap()]);
      window.snap?.pay(token, {
        onSuccess: () => {
          setWatching(true);
          sync.mutate();
        },
        onPending: () => {
          setWatching(true);
          sync.mutate();
        },
        onError: () => setPayError("Pembayaran gagal. Silakan coba lagi."),
        onClose: () => sync.mutate(),
      });
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : "Tidak dapat membuka pembayaran. Coba lagi.");
    }
  }

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
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePay}
              disabled={pay.isPending}
              className="bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pay.isPending ? "Membuka pembayaran..." : "Bayar Sekarang"}
            </button>
            <button
              type="button"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="border border-neutral-400 bg-white px-6 py-3 text-sm hover:border-black disabled:opacity-50"
            >
              {sync.isPending ? "Memeriksa..." : "Periksa status pembayaran"}
            </button>
          </div>
          {payError && (
            <p role="alert" className="mt-3 text-red-600">
              {payError}
            </p>
          )}
          {sync.isError && !payError && (
            <p role="alert" className="mt-3 text-red-600">
              Gagal memeriksa status pembayaran. Coba lagi.
            </p>
          )}
          {watching && (
            <p className="mt-3 text-xs text-orange-800">Menunggu konfirmasi pembayaran...</p>
          )}
        </div>
      )}

      {o.status === "PAID" && (
        <div className="mt-6 border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">
          <p className="font-medium">Pembayaran diterima. Terima kasih!</p>
          <p className="mt-1">Pesananmu akan segera diproses.</p>
        </div>
      )}

      {(o.status === "EXPIRED" || o.status === "CANCELLED") && (
        <div className="mt-6 border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          Pesanan ini sudah tidak aktif. Silakan buat pesanan baru dari keranjang.
        </div>
      )}

            {o.shipment && (
        <div className="mt-6 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">Paket sudah dikirim</p>
          <p className="mt-1">Kurir: {o.shipment.courier}</p>
          <p>
            Nomor resi: <span className="font-mono font-medium">{o.shipment.trackingNumber}</span>
          </p>
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
        {o.courierCompany && (
          <p className="mt-2 text-xs text-neutral-500">
            Kurir: {o.courierCompany} {o.courierService}
          </p>
        )}
      </section>

      <Link to="/products" className="mt-10 inline-block text-sm underline">
        Lanjut belanja
      </Link>
    </div>
  );
}