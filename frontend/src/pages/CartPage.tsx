import { Link } from "react-router-dom";
import { useCartLines } from "../hooks/useCartLines";
import { useCartStore } from "../store/cart";
import { formatRupiah } from "../lib/format";
import CartLineItem from "../components/CartLineItem";

export default function CartPage() {
  const cart = useCartLines();
  const notice = useCartStore((s) => s.notice);
  const setNotice = useCartStore((s) => s.setNotice);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Keranjang</h1>

      {notice && (
        <div className="mt-4 flex items-start justify-between gap-3 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan">
            &times;
          </button>
        </div>
      )}

      {cart.lines.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">Keranjangmu masih kosong.</p>
          <Link to="/products" className="mt-4 inline-block bg-black px-6 py-3 text-sm font-semibold text-white">
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {cart.lines.map((line) => (
              <CartLineItem
                key={line.variantId}
                line={line}
                onQuantity={(q) => setQuantity(line.variantId, q)}
                onRemove={() => remove(line.variantId)}
              />
            ))}
            {cart.isError && (
              <p className="py-3 text-sm text-red-600">Gagal memuat data keranjang. Pastikan backend berjalan.</p>
            )}
          </div>

          <aside className="h-fit border border-neutral-200 p-5">
            <h2 className="text-lg font-bold">Ringkasan</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span>Subtotal ({cart.totalQuantity} item)</span>
              <span className="font-semibold">{formatRupiah(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Ongkos kirim dihitung saat checkout.</p>

            {/* <button
              type="button"
              disabled
              title="Checkout dibuat di tahap berikutnya"
              className="mt-6 w-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Lanjut ke Checkout (segera)
            </button> */}
            {cart.canCheckout ? (
                <Link
                  to="/checkout"
                  className="mt-6 block w-full bg-black px-4 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Lanjut ke Checkout
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lanjut ke Checkout
                </button>
              )}
            {!cart.canCheckout && cart.lines.length > 0 && !cart.isError && (
              <p className="mt-2 text-xs text-neutral-500">
                Pastikan semua item tersedia sebelum checkout.
              </p>
            )}
            <Link to="/products" className="mt-4 block text-center text-sm underline">
              Lanjut belanja
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}