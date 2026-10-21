import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAddresses } from "../hooks/useAddresses";
import { useCartLines } from "../hooks/useCartLines";
import AddressForm from "../components/AddressForm";
import { toAddressInput } from "../lib/address";
import { formatRupiah } from "../lib/format";
import type { AddressFormValues } from "../types";

export default function CheckoutPage() {
  const { user, isLoading: authLoading } = useAuth();
  const cart = useCartLines();
  const { list, create } = useAddresses(Boolean(user));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [guest, setGuest] = useState<AddressFormValues | null>(null);
  const [editingGuest, setEditingGuest] = useState(true);

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

  const addresses = list.data ?? [];
  const effectiveId =
    selectedId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;
  const selectedAddress = addresses.find((a) => a.id === effectiveId) ?? null;
  const showNewForm = adding || (list.isSuccess && addresses.length === 0);

  const addressReady = user ? Boolean(selectedAddress) : Boolean(guest) && !editingGuest;
  const readyToOrder = cart.canCheckout && addressReady;

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
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="mt-4 text-sm underline"
                  >
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
                    <button
                      type="button"
                      onClick={() => setEditingGuest(true)}
                      className="mt-3 underline"
                    >
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
            <h2 className="text-xl font-bold text-neutral-400">2. Pengiriman</h2>
            <p className="mt-2 text-sm text-neutral-400">Pilihan kurir tersedia di tahap berikutnya.</p>
          </section>

          <section className="border-t border-neutral-200 pt-6">
            <h2 className="text-xl font-bold text-neutral-400">3. Pembayaran</h2>
            <p className="mt-2 text-sm text-neutral-400">Pembayaran online tersedia di tahap berikutnya.</p>
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
            <div className="flex justify-between text-neutral-500">
              <span>Ongkos kirim</span>
              <span>Dihitung nanti</span>
            </div>
          </div>

          <ul className="mt-5 space-y-1 text-xs text-neutral-600">
            <li>{cart.canCheckout ? "\u2713" : "\u25CB"} Item keranjang tersedia</li>
            <li>{addressReady ? "\u2713" : "\u25CB"} Alamat pengiriman dipilih</li>
          </ul>

          <button
            type="button"
            disabled
            title={readyToOrder ? "Pembuatan pesanan dikerjakan di tahap 3B" : "Lengkapi data terlebih dahulu"}
            className="mt-5 w-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Buat Pesanan (segera)
          </button>

          <Link to="/cart" className="mt-4 block text-center text-sm underline">
            Kembali ke keranjang
          </Link>
        </aside>
      </div>
    </div>
  );
}