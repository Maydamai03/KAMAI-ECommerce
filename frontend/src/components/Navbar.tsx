import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors hover:text-black ${
    isActive ? "text-black" : "text-neutral-500"
  }`;

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Kamai
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <NavLink to="/" end className={linkClass}>
            Beranda
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Produk
          </NavLink>

          {!isLoading &&
            (user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-neutral-600 sm:inline">
                  Halo, {user.name.split(" ")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="text-sm font-medium text-neutral-500 hover:text-black"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <NavLink to="/login" className={linkClass}>
                Masuk
              </NavLink>
            ))}

          <span className="text-sm text-neutral-400">Keranjang (0)</span>
        </nav>
      </div>
    </header>
  );
}