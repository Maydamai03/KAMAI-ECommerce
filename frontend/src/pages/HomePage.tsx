import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getProducts } from "../services/catalog";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";

export default function HomePage() {
  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => getProducts({ featured: "true", limit: 8 }),
  });

  const latest = useQuery({
    queryKey: ["products", "latest"],
    queryFn: () => getProducts({ sort: "newest", limit: 4 }),
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <p className="text-sm uppercase tracking-widest text-neutral-400">Koleksi Terbaru</p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
            Gaya santai untuk setiap hari.
          </h1>
          <Link
            to="/products"
            className="mt-8 inline-block bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-200"
          >
            Belanja Sekarang
          </Link>
        </div>
      </section>

      {/* Kategori */}
      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="flex flex-wrap gap-3">
          {categories.data?.map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.slug}`}
              className="border border-neutral-300 px-4 py-2 text-sm hover:border-black"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <ProductSection title="Produk Unggulan" query={featured} />
      <ProductSection title="Baru Datang" query={latest} />
    </div>
  );
}

function ProductSection({
  title,
  query,
}: {
  title: string;
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getProducts>>>>;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12">
      <h2 className="mb-6 text-2xl font-bold">{title}</h2>

      {query.isError && (
        <p className="text-sm text-red-600">Gagal memuat produk. Pastikan backend berjalan.</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {query.isLoading &&
          Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        {query.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}