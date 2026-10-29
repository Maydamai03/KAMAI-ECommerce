import { useState } from "react";
import { Link } from "react-router-dom";
import { formatRupiah } from "../lib/format";
import { responsiveImage } from "../lib/image";
import type { ProductListItem } from "../types";

const SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";
const WIDTHS = [400, 600, 900];

interface Props {
  product: ProductListItem;
  /** true untuk kartu di layar pertama: gambar dimuat segera, bukan menunggu */
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: Props) {
  const [hovered, setHovered] = useState(false);
  const main = responsiveImage(product.image, WIDTHS);
  const hover = responsiveImage(product.hoverImage, WIDTHS);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onFocus={() => setHovered(true)}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        {main.src && (
          <img
            src={main.src}
            srcSet={main.srcSet}
            sizes={SIZES}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
          />
        )}
        {hovered && hover.src && (
          <img
            src={hover.src}
            srcSet={hover.srcSet}
            sizes={SIZES}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 bg-black px-2 py-1 text-xs font-medium text-white">Habis</span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-neutral-600">{formatRupiah(product.price)}</p>
      </div>
    </Link>
  );
}