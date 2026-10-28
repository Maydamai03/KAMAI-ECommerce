import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useStoreInfo } from "../hooks/useStoreInfo";
import { useCartStore } from "../store/cart";
import { BagIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import MenuPanel from "./MenuPanel";
import SearchPanel from "./SearchPanel";
import SideDrawer from "./SideDrawer";

type Panel = "menu" | "search" | null;

const sideButton =
  "inline-flex h-10 items-center gap-2 rounded-full px-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 sm:px-3";

export default function Navbar() {
  const { user } = useAuth();
  const { data: store } = useStoreInfo();
  const location = useLocation();
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const openCart = useCartStore((s) => s.open);

  const [panel, setPanel] = useState<Panel>(null);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);

  // Tutup panel saat berpindah halaman
  useEffect(() => {
    setPanel(null);
  }, [location.pathname, location.search]);

  const name = store?.name ?? "Kamai";
  const logoUrl = store?.logoUrl && store.logoUrl !== failedLogo ? store.logoUrl : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
          {/* Kiri: Menu dan Search */}
          <div className="flex items-center justify-self-start">
            <button type="button" onClick={() => setPanel("menu")} aria-label="Buka menu" className={sideButton}>
              <MenuIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <button type="button" onClick={() => setPanel("search")} aria-label="Cari produk" className={sideButton}>
              <SearchIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* Tengah: logo */}
          <Link to="/" aria-label={`${name}, ke beranda`} className="justify-self-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                onError={() => setFailedLogo(logoUrl)}
                className="h-8 w-auto max-w-[140px] object-contain sm:h-9 sm:max-w-[200px]"
              />
            ) : (
              <span className="block max-w-[40vw] truncate text-lg font-bold uppercase tracking-[0.22em] sm:text-xl">
                {name}
              </span>
            )}
          </Link>

          {/* Kanan: Keranjang dan Akun */}
          <div className="flex items-center gap-1 justify-self-end sm:gap-2">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Buka keranjang, ${count} item`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 transition-colors hover:bg-neutral-100"
            >
              <BagIcon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold leading-none text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>

            <Link
              to="/account"
              aria-label="Akun saya"
              title={user ? user.name : "Masuk atau daftar"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-800 transition-colors hover:border-black hover:bg-neutral-100"
            >
              <UserIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <SideDrawer open={panel === "menu"} onClose={() => setPanel(null)} label="Menu">
        <MenuPanel onClose={() => setPanel(null)} />
      </SideDrawer>

      <SideDrawer open={panel === "search"} onClose={() => setPanel(null)} label="Pencarian" widthClass="max-w-md">
        <SearchPanel onClose={() => setPanel(null)} />
      </SideDrawer>
    </>
  );
}