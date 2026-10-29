import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useAddresses } from "../hooks/useAddresses";
import { useCartLines } from "../hooks/useCartLines";
import { useCartStore } from "../store/cart";
import AddressForm from "../components/AddressForm";
import { toAddressInput } from "../lib/address";
import { ApiError } from "../lib/api";
import { formatEtd, formatRupiah } from "../lib/format";
import { rememberOrderEmail } from "../lib/orderEmail";
import { createOrder } from "../services/orders";
import { getShippingRates } from "../services/shipping";
import type { AddressFormValues } from "../types";
import { usePrivatePage } from "../hooks/usePageMeta";

export default function CheckoutPage() {
  usePrivatePage("Checkout");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const cart = useCartLines();
  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const { list, create } = useAddresses(Boolean(user));
  const placeOrder = useMutation({ mutationFn: createOrder });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [guest, setGuest] = useState<AddressFormValues | null>(null);
  const [editingGuest, setEditingGuest] = useState(true);
  const [selectedRateKey, setSelectedRateKey] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const addresses = list.data ?? [];
  const effectiveId =
    selectedId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
  const selectedAddress = addresses.find((a) => a.id === effectiveId) ?? null;
  const showNewForm = adding || (list.isSuccess && addresses.length === 0);

  const addressReady = user ? Boolean(selectedAddress) : Boolean(guest) && !editingGuest;

  // Tujuan pengiriman untuk menghitung ongkir
  const destination = user
    ? selectedAddress
      ? { areaId: selectedAddress.areaId ?? undefined, postalCode: selectedAddress.postalCode }
      : null
    : guest && !editingGuest
      ? { areaId: guest.areaId || undefined, postalCode: guest.postalCode }
      : null;

  const cartKey = cartItems.map((i) => `${i.variantId}:${i.quantity}`).join(",");
  const ratesQuery = useQuery({
    queryKey: ["shipping-rates", cartKey, destination?.areaId ?? "", destination?.postalCode ?? ""],
    queryFn: () =>
      getShippingRates({
        items: cartItems,
        areaId: destination?.areaId,
        postalCode: destination!.postalCode,
      }),
    enabled: Boolean(destination) && cart.canCheckout,
    staleTime: 60_000,
    retry: false,
  });

  const rates = ratesQuery.data?.rates ?? [];
  // Pilihan pembeli bila masih berlaku; kalau tidak, layanan termurah
  const effectiveRate =
    rates.find((r) => `${r.courierCode}:${r.serviceCode}` === selectedRateKey) ?? rates[0] ?? null;

  const shippingCost = effectiveRate?.price ?? 0;
  const readyToOrder =
    cart.canCheckout && addressReady && Boolean(effectiveRate) && !ratesQuery.isFetching;

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Keranjangmu kosong</h1>
        <Link to="/products" className="mt-4 inline-block underline">
          Mulai belanja
        </Link>
      </div>
    );
  }

  async function handlePlaceOrder() {
    if (!readyToOrder || !effectiveRate || placeOrder.isPending) return;
    setOrderError(null);

    const items = cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    const shipping = {
      courierCode: effectiveRate.courierCode,
      serviceCode: effectiveRate.serviceCode,
      expectedCost: effectiveRate.price,
    };
    const payload = user
      ? { items, addressId: selectedAddress?.id, shipping }
      : {
          items,
          email: guest?.email,
          address: guest ? toAddressInput(guest) : undefined,
          shipping,
        };

    try {
      const order = await placeOrder.mutateAsync(payload);
      if (!user && guest) rememberOrderEmail(order.orderNumber, guest.email);

      // Stok berubah, jadi data produk di cache perlu dimuat ulang
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });

      navigate(`/orders/${order.orderNumber}`, {
        replace: true,
        state: { justCreated: true },
      });
      clearCart();
    } catch (e) {
      if (e instanceof ApiError && e.code === "CART_INVALID") {
        queryClient.invalidateQueries({ queryKey: ["cart-validate"] });
        queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
        setOrderError(
          "Stok atau ketersediaan item berubah. Keranjang sudah diperbarui, silakan periksa kembali."
        );
      } else if (e instanceof ApiError && e.code === "SHIPPING_CHANGED") {
        queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
        setOrderError("Tarif pengiriman berubah. Harga terbaru sudah ditampilkan, silakan periksa lalu coba lagi.");
      } else if (e instanceof ApiError && e.code === "SHIPPING_UNAVAILABLE") {
        queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
        setOrderError("Layanan kurir yang dipilih tidak tersedia lagi. Silakan pilih kurir lain.");
      } else {
        setOrderError(e instanceof ApiError ? e.message : "Gagal membuat pesanan. Coba lagi.");
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Checkout</h1>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold">1. Kontak dan alamat pengiriman</h2>

            {authLoading && <p className="mt-4 text-sm text-neutral-500">Memuat...</p>}

            {/* Pengguna login: pilih dari alamat tersimpan */}
            {!authLoading && user && (
              <div className="mt-4">
                <p className="text-sm text-neutral-500">
                  Masuk sebagai {user.name} ({user.email})
                </p>

                {list.isLoading && <p className="mt-4 text-sm text-neutral-500">Memuat alamat...</p>}
                {list.isError && (
                  <p className="mt-4 text-sm text-red-600">Gagal memuat alamat. Pastikan backend berjalan.</p>
                )}

                {addresses.length > 0 && (
                  <ul className="mt-4 space-y-3">
                    {addresses.map((a) => (
                      <li key={a.id}>
                        <label
                          className={`flex cursor-pointer gap-3 border p-4 text-sm ${
                            a.id === effectiveId ? "border-black" : "border-neutral-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={a.id === effectiveId}
                            onChange={() => {
                              setSelectedId(a.id);
                              setAdding(false);
                            }}
                            className="mt-1"
                          />
                          <span>
                            <span className="font-medium">
                              {a.recipientName} &middot; {a.phone}
                              {a.isDefault && (
                                <span className="ml-2 bg-black px-2 py-0.5 text-xs text-white">Utama</span>
                              )}
                            </span>
                            <span className="mt-1 block">{a.street}</span>
                            <span className="block text-neutral-600">
                              {a.district}, {a.city}, {a.province} {a.postalCode}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                {!showNewForm && (
                  <button type="button" onClick={() => setAdding(true)} className="mt-4 text-sm underline">
                    + Tambah alamat baru
                  </button>
                )}

                {showNewForm && (
                  <div className="mt-4 border border-neutral-200 p-5">
                    <h3 className="mb-4 font-semibold">Alamat baru</h3>
                    <AddressForm
                      showDefault
                      submitLabel="Simpan dan gunakan alamat ini"
                      onSubmit={async (values) => {
                        const created = await create.mutateAsync(toAddressInput(values));
                        setSelectedId(created.id);
                        setAdding(false);
                      }}
                      onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tamu: isi email dan alamat */}
            {!authLoading && !user && (
              <div className="mt-4">
                <p className="text-sm text-neutral-600">
                  Sudah punya akun?{" "}
                  <Link to="/login" state={{ from: "/checkout" }} className="font-medium underline">
                    Masuk
                  </Link>{" "}
                  untuk memakai alamat tersimpan, atau lanjutkan sebagai tamu.
                </p>

                {guest && !editingGuest ? (
                  <div className="mt-4 border border-black p-4 text-sm">
                    <p className="font-medium">
                      {guest.recipientName} &middot; {guest.phone}
                    </p>
                    <p className="text-neutral-500">{guest.email}</p>
                    <p className="mt-2">{guest.street}</p>
                    <p className="text-neutral-600">
                      {guest.district}, {guest.city}, {guest.province} {guest.postalCode}
                    </p>
                    <button type="button" onClick={() => setEditingGuest(true)} className="mt-3 underline">
                      Ubah
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <AddressForm
                      withEmail
                      defaultValues={guest ?? undefined}
                      submitLabel="Gunakan alamat ini"
                      onSubmit={async (values) => {
                        setGuest(values);
                        setEditingGuest(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="border-t border-neutral-200 pt-6">
            <h2 className="text-xl font-bold">2. Pengiriman</h2>

            {!destination && (
              <p className="mt-2 text-sm text-neutral-500">
                Pilih alamat pengiriman untuk melihat pilihan kurir dan ongkos kirim.
              </p>
            )}

            {destination && !destination.areaId && (
              <p className="mt-2 text-xs text-orange-700">
                Alamat ini belum memiliki area terpilih, jadi ongkir dihitung dari kode pos. Ubah alamat di
                halaman Akun untuk hasil yang lebih akurat.
              </p>
            )}

            {destination && ratesQuery.isLoading && (
              <p className="mt-3 text-sm text-neutral-500">Menghitung ongkos kirim...</p>
            )}

            {ratesQuery.isError && (
              <div className="mt-3 text-sm text-red-600">
                Gagal memuat tarif pengiriman.{" "}
                <button type="button" onClick={() => ratesQuery.refetch()} className="underline">
                  Coba lagi
                </button>
              </div>
            )}

            {ratesQuery.data && rates.length === 0 && (
              <p className="mt-3 text-sm text-neutral-600">
                Belum ada layanan pengiriman untuk alamat ini.
              </p>
            )}

            {rates.length > 0 && (
              <>
                <ul className="mt-4 space-y-3">
                  {rates.map((r) => {
                    const key = `${r.courierCode}:${r.serviceCode}`;
                    const active = effectiveRate
                      ? effectiveRate.courierCode === r.courierCode &&
                        effectiveRate.serviceCode === r.serviceCode
                      : false;
                    return (
                      <li key={key}>
                        <label
                          className={`flex cursor-pointer items-start justify-between gap-3 border p-4 text-sm ${
                            active ? "border-black" : "border-neutral-200"
                          }`}
                        >
                          <span className="flex gap-3">
                            <input
                              type="radio"
                              name="shipping"
                              checked={active}
                              onChange={() => setSelectedRateKey(key)}
                              className="mt-1"
                            />
                            <span>
                              <span className="font-medium">
                                {r.courierName} {r.serviceName}
                              </span>
                              <span className="block text-xs text-neutral-500">{r.description}</span>
                              <span className="block text-xs text-neutral-500">
                                Estimasi {formatEtd(r.etdMinDays, r.etdMaxDays)}
                              </span>
                            </span>
                          </span>
                          <span className="font-semibold">{formatRupiah(r.price)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-neutral-500">
                  Berat total sekitar {ratesQuery.data?.weightGram} gram.
                </p>
              </>
            )}
          </section>

          <section className="border-t border-neutral-200 pt-6">
            <h2 className="text-xl font-bold text-neutral-400">3. Pembayaran</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Pembayaran dilakukan setelah pesanan dibuat, di halaman pesanan.
            </p>
          </section>
        </div>

        {/* Ringkasan */}
        <aside className="h-fit border border-neutral-200 p-5">
          <h2 className="text-lg font-bold">Ringkasan Pesanan</h2>

          <ul className="mt-4 divide-y divide-neutral-200 text-sm">
            {cart.lines.map((line) =>
              line.data && line.data.available ? (
                <li key={line.variantId} className="flex justify-between gap-3 py-3">
                  <span>
                    {line.data.name}
                    <span className="block text-xs text-neutral-500">
                      {line.data.color} / {line.data.size} &times; {line.quantity}
                    </span>
                    {line.issue && (
                      <span className="block text-xs text-red-600">Periksa jumlah/stok di keranjang</span>
                    )}
                  </span>
                  <span>{formatRupiah(line.lineTotal)}</span>
                </li>
              ) : (
                <li key={line.variantId} className="py-3 text-neutral-400">
                  Memuat item...
                </li>
              )
            )}
          </ul>

          <div className="mt-4 space-y-1 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatRupiah(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Ongkos kirim
                {effectiveRate ? ` (${effectiveRate.courierName} ${effectiveRate.serviceName})` : ""}
              </span>
              <span>{effectiveRate ? formatRupiah(shippingCost) : "Pilih alamat dulu"}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatRupiah(cart.subtotal + shippingCost)}</span>
            </div>
          </div>

          <ul className="mt-5 space-y-1 text-xs text-neutral-600">
            <li>{cart.canCheckout ? "\u2713" : "\u25CB"} Item keranjang tersedia</li>
            <li>{addressReady ? "\u2713" : "\u25CB"} Alamat pengiriman dipilih</li>
            <li>{effectiveRate ? "\u2713" : "\u25CB"} Kurir dipilih</li>
          </ul>

          {orderError && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {orderError}
            </p>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!readyToOrder || placeOrder.isPending}
            className="mt-5 w-full bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {placeOrder.isPending ? "Memproses..." : "Buat Pesanan"}
          </button>

          <Link to="/cart" className="mt-4 block text-center text-sm underline">
            Kembali ke keranjang
          </Link>
        </aside>
      </div>
    </div>
  );
}