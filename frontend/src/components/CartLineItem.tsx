import { Link } from "react-router-dom";
import { formatRupiah } from "../lib/format";
import { MAX_PER_LINE } from "../store/cart";
import type { CartLineView } from "../hooks/useCartLines";

interface Props {
  line: CartLineView;
  compact?: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
}

export default function CartLineItem({ line, compact, onQuantity, onRemove, onNavigate }: Props) {
  const { data, quantity, issue } = line;
  const thumb = compact ? "h-24 w-20" : "h-32 w-28";

  if (!data) {
    return (
      <div className="flex animate-pulse gap-4 py-4">
        <div className={`${thumb} shrink-0 bg-neutral-200`} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-neutral-200" />
          <div className="h-4 w-1/3 bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (!data.available) {
    return (
      <div className="flex items-center justify-between gap-4 py-4 text-sm">
        <span className="text-neutral-500">Produk tidak tersedia</span>
        <button type="button" onClick={onRemove} className="underline">
          Hapus
        </button>
      </div>
    );
  }

  const max = Math.min(MAX_PER_LINE, data.stock);

  return (
    <div className="flex gap-4 py-4">
      <Link to={`/products/${data.slug}`} onClick={onNavigate} className={`${thumb} shrink-0 overflow-hidden bg-neutral-100`}>
        {data.image && (
          <img src={data.image} alt={data.name} loading="lazy" className="h-full w-full object-cover" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <Link
            to={`/products/${data.slug}`}
            onClick={onNavigate}
            className="text-sm font-medium hover:underline"
          >
            {data.name}
          </Link>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Hapus ${data.name}`}
            className="text-sm text-neutral-400 hover:text-black"
          >
            Hapus
          </button>
        </div>

        <p className="mt-0.5 text-xs text-neutral-500">
          {data.color} / {data.size}
        </p>
        <p className="mt-1 text-sm">{formatRupiah(data.unitPrice)}</p>

        {issue === "OUT_OF_STOCK" && (
          <p className="mt-1 text-xs text-red-600">Stok habis. Hapus item ini untuk melanjutkan.</p>
        )}
        {issue === "INSUFFICIENT_STOCK" && (
          <p className="mt-1 text-xs text-orange-600">Stok tersisa {data.stock}.</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="inline-flex items-center border border-neutral-300 text-sm">
            <button
              type="button"
              onClick={() => onQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Kurangi jumlah"
              className="px-3 py-1 disabled:opacity-40"
            >
              -
            </button>
            <span className="min-w-8 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => onQuantity(quantity + 1)}
              disabled={quantity >= max}
              aria-label="Tambah jumlah"
              className="px-3 py-1 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <p className="text-sm font-semibold">{formatRupiah(line.lineTotal)}</p>
        </div>
      </div>
    </div>
  );
}