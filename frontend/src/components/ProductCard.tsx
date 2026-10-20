import { Link } from "react-router-dom";
import { formatRupiah } from "../lib/format";
import type { ProductListItem } from "../types";

export default function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
          />
        )}
        {product.hoverImage && (
          <img
            src={product.hoverImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 bg-black px-2 py-1 text-xs font-medium text-white">
            Habis
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-neutral-600">{formatRupiah(product.price)}</p>
      </div>
    </Link>
  );
}