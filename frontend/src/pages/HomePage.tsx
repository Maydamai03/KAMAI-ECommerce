import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getProducts } from "../services/catalog";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import HeroCarousel from "../components/HeroCarousel";

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
      <HeroCarousel />

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

      <ProductSection title="Populer Product" query={featured} />
      <ProductSection title="New Arrivals" query={latest} />
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