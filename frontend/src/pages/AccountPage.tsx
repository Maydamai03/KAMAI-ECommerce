import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAddresses } from "../hooks/useAddresses";
import AddressForm from "../components/AddressForm";
import { addressToInput, toAddressInput } from "../lib/address";
import { ApiError } from "../lib/api";
import type { Address } from "../types";

type Mode = { type: "closed" } | { type: "new" } | { type: "edit"; address: Address };

export default function AccountPage() {
  const { user, isLoading } = useAuth();
  const { list, create, update, remove } = useAddresses(Boolean(user));
  const [mode, setMode] = useState<Mode>({ type: "closed" });
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-neutral-500">Memuat...</div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: "/account" }} replace />;

  async function handleDelete(address: Address) {
    if (!window.confirm("Hapus alamat ini?")) return;
    setActionError(null);
    try {
      await remove.mutateAsync(address.id);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Gagal menghapus alamat.");
    }
  }

  async function handleMakeDefault(address: Address) {
    setActionError(null);
    try {
      await update.mutateAsync({ id: address.id, input: addressToInput(address, true) });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Gagal mengubah alamat utama.");
    }
  }

  const addresses = list.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Akun Saya</h1>

      <section className="mt-6 border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Profil</h2>
        <p className="mt-3 text-sm">{user.name}</p>
        <p className="text-sm text-neutral-500">{user.email}</p>
        {user.phone && <p className="text-sm text-neutral-500">{user.phone}</p>}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Alamat Tersimpan</h2>
          {mode.type === "closed" && (
            <button
              type="button"
              onClick={() => setMode({ type: "new" })}
              className="border border-black px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Tambah alamat
            </button>
          )}
        </div>

        {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
        {list.isError && <p className="mt-3 text-sm text-red-600">Gagal memuat alamat.</p>}

        {mode.type === "new" && (
          <div className="mt-4 border border-neutral-200 p-5">
            <h3 className="mb-4 font-semibold">Alamat baru</h3>
            <AddressForm
              showDefault
              submitLabel="Simpan alamat"
              onSubmit={async (values) => {
                await create.mutateAsync(toAddressInput(values));
                setMode({ type: "closed" });
              }}
              onCancel={() => setMode({ type: "closed" })}
            />
          </div>
        )}

        {mode.type === "edit" && (
          <div className="mt-4 border border-neutral-200 p-5">
            <h3 className="mb-4 font-semibold">Ubah alamat</h3>
            <AddressForm
              showDefault={!mode.address.isDefault}
              defaultValues={{
                recipientName: mode.address.recipientName,
                phone: mode.address.phone,
                province: mode.address.province,
                city: mode.address.city,
                district: mode.address.district,
                postalCode: mode.address.postalCode,
                street: mode.address.street,
                note: mode.address.note ?? "",
                isDefault: mode.address.isDefault,
              }}
              submitLabel="Simpan perubahan"
              onSubmit={async (values) => {
                await update.mutateAsync({
                  id: mode.address.id,
                  input: toAddressInput(values),
                });
                setMode({ type: "closed" });
              }}
              onCancel={() => setMode({ type: "closed" })}
            />
          </div>
        )}

        {list.isLoading && <p className="mt-4 text-sm text-neutral-500">Memuat alamat...</p>}

        {!list.isLoading && addresses.length === 0 && mode.type === "closed" && (
          <p className="mt-4 text-sm text-neutral-500">Belum ada alamat tersimpan.</p>
        )}

        <ul className="mt-4 space-y-3">
          {addresses.map((a) => (
            <li key={a.id} className="border border-neutral-200 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {a.recipientName}
                    {a.isDefault && (
                      <span className="ml-2 bg-black px-2 py-0.5 text-xs font-medium text-white">
                        Utama
                      </span>
                    )}
                  </p>
                  <p className="text-neutral-500">{a.phone}</p>
                  <p className="mt-2">{a.street}</p>
                  <p className="text-neutral-600">
                    {a.district}, {a.city}, {a.province} {a.postalCode}
                  </p>
                  {a.note && <p className="mt-1 text-xs text-neutral-500">Catatan: {a.note}</p>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <button type="button" onClick={() => setMode({ type: "edit", address: a })} className="underline">
                  Ubah
                </button>
                {!a.isDefault && (
                  <button type="button" onClick={() => handleMakeDefault(a)} className="underline">
                    Jadikan utama
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(a)} className="text-red-600 underline">
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Riwayat Pesanan</h2>
        <p className="mt-3 text-sm text-neutral-500">
          Pesananmu akan muncul di sini setelah fitur checkout aktif.
        </p>
      </section>
    </div>
  );
}