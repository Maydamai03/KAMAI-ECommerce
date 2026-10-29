import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../services/catalog";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import HeroCarousel from "../components/HeroCarousel";
import { useSeo } from "../hooks/usePageMeta";
import { useStoreInfo } from "../hooks/useStoreInfo";

export default function HomePage() {
  // Semua hook ada DI DALAM fungsi ini, di bagian paling atas
  const { data: store } = useStoreInfo();
  const storeName = store?.name ?? "Kamai";

  useSeo({
    title: `${storeName} | Toko Pakaian Online`,
    description: `Belanja pakaian terbaru di ${storeName}. Pilihan ukuran dan warna lengkap, bayar dengan mudah.`,
    path: "/",
  });

  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => getProducts({ featured: "true", limit: 8 }),
  });

  const latest = useQuery({
    queryKey: ["products", "latest"],
    queryFn: () => getProducts({ sort: "newest", limit: 4 }),
  });

  return (
    <div>
      <HeroCarousel />
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
        {query.isLoading && Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        {query.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}