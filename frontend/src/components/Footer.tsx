import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStoreInfo } from "../hooks/useStoreInfo";
import { getCategories } from "../services/catalog";
import { waLink } from "../lib/contact";

const linkClass = "text-neutral-400 transition-colors hover:text-white";
const headingClass = "mb-4 text-xs font-semibold uppercase tracking-widest text-white";

export default function Footer() {
  const { data: store } = useStoreInfo();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });

  const name = store?.name ?? "Kamai";
  const hasContact = Boolean(store?.email || store?.phone || store?.whatsapp || store?.hours);

  return (
    <footer className="mt-16 bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="text-2xl font-bold tracking-tight">
              {name}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">
              {store?.address ?? "Gaya santai untuk setiap hari."}
            </p>
          </div>

          {/* Belanja */}
          <nav aria-label="Belanja">
            <h2 className={headingClass}>Belanja</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products" className={linkClass}>
                  Semua produk
                </Link>
              </li>
              {categories.data?.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${c.slug}`} className={linkClass}>
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/cart" className={linkClass}>
                  Keranjang
                </Link>
              </li>
            </ul>
          </nav>

          {/* Bantuan */}
          <nav aria-label="Bantuan">
            <h2 className={headingClass}>Bantuan</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className={linkClass}>
                  Pertanyaan umum
                </Link>
              </li>
              <li>
                <Link to="/policy" className={linkClass}>
                  Pengiriman &amp; retur
                </Link>
              </li>
              <li>
                <Link to="/about" className={linkClass}>
                  Tentang kami
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkClass}>
                  Kontak
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={linkClass}>
                  Privasi &amp; syarat
                </Link>
              </li>
            </ul>
          </nav>

          {/* Kontak */}
          <div>
            <h2 className={headingClass}>Hubungi kami</h2>
            {hasContact ? (
              <ul className="space-y-2 text-sm text-neutral-400">
                {store?.email && (
                  <li>
                    <a href={`mailto:${store.email}`} className={linkClass}>
                      {store.email}
                    </a>
                  </li>
                )}
                {store?.phone && (
                  <li>
                    <a href={`tel:${store.phone}`} className={linkClass}>
                      {store.phone}
                    </a>
                  </li>
                )}
                {store?.hours && <li>{store.hours}</li>}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">
                <Link to="/contact" className={linkClass}>
                  Lihat halaman kontak
                </Link>
              </p>
            )}

            {store?.whatsapp && (
              <a
                href={waLink(store.whatsapp, `Halo ${name}, saya ingin bertanya.`)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-block border border-white px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
                Chat WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-6 text-xs text-neutral-500">
          <p>
            &copy; {new Date().getFullYear()} {name}. Seluruh hak cipta dilindungi.
          </p>
          <p>Harga dalam Rupiah (IDR)</p>
        </div>
      </div>
    </footer>
  );
}