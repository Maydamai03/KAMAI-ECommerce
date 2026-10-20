import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCartLines } from "../hooks/useCartLines";
import { useCartStore } from "../store/cart";
import { formatRupiah } from "../lib/format";
import CartLineItem from "./CartLineItem";

export default function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const notice = useCartStore((s) => s.notice);
  const setNotice = useCartStore((s) => s.setNotice);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const cart = useCartLines();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang belanja"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
          <h2 className="text-lg font-bold">Keranjang ({cart.totalQuantity})</h2>
          <button type="button" onClick={close} aria-label="Tutup keranjang" className="text-2xl leading-none">
            &times;
          </button>
        </div>

        {notice && (
          <div className="flex items-start justify-between gap-3 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <p>{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan">
              &times;
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4">
          {cart.lines.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium">Keranjang masih kosong.</p>
              <Link to="/products" onClick={close} className="mt-3 inline-block text-sm underline">
                Mulai belanja
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {cart.lines.map((line) => (
                <CartLineItem
                  key={line.variantId}
                  line={line}
                  compact
                  onQuantity={(q) => setQuantity(line.variantId, q)}
                  onRemove={() => remove(line.variantId)}
                  onNavigate={close}
                />
              ))}
            </div>
          )}
          {cart.isError && (
            <p className="py-3 text-sm text-red-600">Gagal memuat data keranjang. Pastikan backend berjalan.</p>
          )}
        </div>

        {cart.lines.length > 0 && (
          <div className="border-t border-neutral-200 px-4 py-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{formatRupiah(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Ongkos kirim dihitung saat checkout.</p>
            <div className="mt-4 grid gap-2">
              <Link
                to="/cart"
                onClick={close}
                className="border border-black px-4 py-3 text-center text-sm font-semibold hover:bg-neutral-50"
              >
                Lihat Keranjang
              </Link>
              <button
                type="button"
                disabled
                title="Checkout dibuat di tahap berikutnya"
                className="bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Checkout (segera)
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}