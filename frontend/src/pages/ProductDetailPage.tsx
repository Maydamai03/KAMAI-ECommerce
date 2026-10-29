import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../services/catalog";
import { ApiError } from "../lib/api";
import { formatRupiah } from "../lib/format";
import type { ProductDetail } from "../types";
import { useCartStore } from "../store/cart";
import { responsiveImage, sizedImage } from "../lib/image";
import NoIndex from "../components/NoIndex";
import { absoluteUrl, useJsonLd, useSeo } from "../hooks/usePageMeta";
import { useStoreInfo } from "../hooks/useStoreInfo";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

function sizeRank(size: string) {
  const i = SIZE_ORDER.indexOf(size);
  return i === -1 ? 99 : i;
}

export default function ProductDetailPage() {
  const { slug = "" } = useParams();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug),
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 404) && count < 1,
  });

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-8 md:grid-cols-2">
        <div className="aspect-[4/5] bg-neutral-200" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 bg-neutral-200" />
          <div className="h-6 w-1/4 bg-neutral-200" />
          <div className="h-32 bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <NoIndex title="Produk tidak ditemukan" />
        <h1 className="text-2xl font-bold">
          {notFound ? "Produk tidak ditemukan" : "Gagal memuat produk"}
        </h1>
        <Link to="/products" className="mt-4 inline-block underline">
          Kembali ke katalog
        </Link>
      </div>
    );
  }

  // key={product.id} mereset pilihan saat pindah ke produk lain
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }: { product: ProductDetail }) {
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const firstAvailableColor =
    colors.find((c) => product.variants.some((v) => v.color === c && v.stock > 0)) ??
    colors[0];

  const [color, setColor] = useState<string | undefined>(firstAvailableColor);
  const [size, setSize] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const addItem = useCartStore((s) => s.add);
  const openCart = useCartStore((s) => s.open);
  const cartItems = useCartStore((s) => s.items);

  const sizesForColor = product.variants
    .filter((v) => v.color === color)
    .sort((a, b) => sizeRank(a.size) - sizeRank(b.size));

  const variant = product.variants.find((v) => v.color === color && v.size === size);
  const price = variant?.price ?? product.price;
  const allSoldOut = product.variants.every((v) => v.stock === 0);

  function chooseColor(next: string) {
    setColor(next);
    setQty(1);
    setMessage(null);
    // Reset ukuran kalau ukuran terpilih tidak tersedia di warna baru
    const stillOk = product.variants.some(
      (v) => v.color === next && v.size === size && v.stock > 0
    );
    if (!stillOk) setSize(undefined);
  }

  function chooseSize(next: string) {
    setSize(next);
    setQty(1);
    setMessage(null);
  }

  function addToCart() {
  if (!variant) {
    setMessage({ type: "error", text: "Pilih ukuran terlebih dahulu." });
    return;
  }

  const before = cartItems.find((i) => i.variantId === variant.id)?.quantity ?? 0;
  const after = addItem(variant.id, qty, variant.stock);

  if (after === before) {
    setMessage({
      type: "error",
      text: "Jumlah di keranjang sudah mencapai batas pembelian atau stok.",
    });
    return;
  }

  setMessage({ type: "ok", text: "Ditambahkan ke keranjang." });
  openCart();
}

  const stockLabel = !variant
    ? null
    : variant.stock === 0
      ? "Stok habis"
      : variant.stock <= 3
        ? `Sisa ${variant.stock}`
        : "Stok tersedia";

  const image = product.images[activeImage];
  const { data: store } = useStoreInfo();
  const storeName = store?.name ?? "Kamai";
  const plain = product.description.replace(/\s+/g, " ").trim();
  const metaDescription = plain.length > 155 ? `${plain.slice(0, 152)}...` : plain;
  const inStock = product.variants.some((v) => v.stock > 0);
  const lowestPrice = product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price)) : product.price;
  const ogImage = sizedImage(product.images[0]?.url, 1200);

  useSeo({
    title: `${product.name} | ${storeName}`,
    description: metaDescription,
    image: ogImage,
    type: "product",
  });

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: metaDescription,
    sku: product.variants[0]?.sku,
    category: product.category.name,
    image: product.images.map((i) => sizedImage(i.url, 1200)),
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "IDR",
      price: lowestPrice,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-black">Beranda</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-black">Produk</Link>
        <span className="mx-2">/</span>
        <Link to={`/products?category=${product.category.slug}`} className="hover:text-black">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Galeri */}
        <div>
          <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
            {image ? (
              <img
                {...responsiveImage(image.url, [600, 900, 1200])}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt={product.name}
                decoding="async"
                className="h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
              />            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                Tidak ada gambar
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Lihat gambar ${i + 1}`}
                  className={`aspect-square overflow-hidden border-2 ${
                    i === activeImage ? "border-black" : "border-transparent"
                  }`}
                >
                  <img src={sizedImage(img.url, 160)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-2 text-2xl">{formatRupiah(price)}</p>

          {allSoldOut ? (
            <p className="mt-6 font-medium text-red-600">Semua varian sedang habis.</p>
          ) : (
            <>
              {/* Warna */}
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide">
                  Warna: <span className="font-normal normal-case">{color}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const soldOut = !product.variants.some((v) => v.color === c && v.stock > 0);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => chooseColor(c)}
                        className={`border px-4 py-2 text-sm ${
                          c === color
                            ? "border-black bg-black text-white"
                            : "border-neutral-300 hover:border-black"
                        } ${soldOut ? "opacity-50" : ""}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ukuran */}
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Ukuran</p>
                <div className="flex flex-wrap gap-2">
                  {sizesForColor.map((v) => {
                    const soldOut = v.stock === 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => chooseSize(v.size)}
                        className={`min-w-12 border px-4 py-2 text-sm ${
                          v.size === size
                            ? "border-black bg-black text-white"
                            : "border-neutral-300 hover:border-black"
                        } ${soldOut ? "cursor-not-allowed text-neutral-300 line-through hover:border-neutral-300" : ""}`}
                      >
                        {v.size}
                      </button>
                    );
                  })}
                </div>
                {stockLabel && (
                  <p
                    className={`mt-2 text-sm ${
                      variant && variant.stock <= 3 ? "text-orange-600" : "text-neutral-500"
                    }`}
                  >
                    {stockLabel}
                  </p>
                )}
              </div>

              {/* Jumlah */}
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide">Jumlah</p>
                <div className="inline-flex items-center border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.max(1, n - 1))}
                    disabled={qty <= 1}
                    className="px-4 py-2 disabled:opacity-40"
                    aria-label="Kurangi jumlah"
                  >
                    -
                  </button>
                  <span className="min-w-10 text-center text-sm">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.min(variant?.stock ?? 1, n + 1))}
                    disabled={!variant || qty >= variant.stock}
                    className="px-4 py-2 disabled:opacity-40"
                    aria-label="Tambah jumlah"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={addToCart}
                className="mt-8 w-full bg-black px-6 py-4 text-sm font-semibold text-white hover:bg-neutral-800 md:w-auto md:min-w-64"
              >
                Tambah ke Keranjang
              </button>

              {message && (
                <p
                  role="status"
                  className={`mt-3 text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}
                >
                  {message.text}
                </p>
              )}
            </>
          )}

          {/* Deskripsi */}
          <div className="mt-10 border-t border-neutral-200 pt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">Deskripsi</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">
              {product.description}
            </p>
            <p className="mt-4 text-xs text-neutral-400">Berat: {product.weightGram} gram</p>
          </div>
        </div>
      </div>
    </div>
  );
}