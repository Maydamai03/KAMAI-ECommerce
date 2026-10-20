import { Link, NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors hover:text-black ${
    isActive ? "text-black" : "text-neutral-500"
  }`;

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          KAMAI
        </Link>

        <nav className="flex items-center gap-6">
          <NavLink to="/" end className={linkClass}>
            Beranda
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Produk
          </NavLink>
          <span className="text-sm text-neutral-400">Keranjang (0)</span>
        </nav>
      </div>
    </header>
  );
}