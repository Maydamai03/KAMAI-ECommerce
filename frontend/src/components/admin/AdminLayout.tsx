import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true, ready: true },
  { to: "/admin/orders", label: "Pesanan", ready: false },
  { to: "/admin/products", label: "Produk", ready: true },
  { to: "/admin/categories", label: "Kategori", ready: true },
  { to: "/admin/settings", label: "Pengaturan", ready: false },
];

export default function AdminLayout() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-sm text-neutral-500">Memuat...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Akunmu tidak memiliki izin untuk membuka halaman admin.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          Kembali ke toko
        </Link>
      </div>
    );
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block whitespace-nowrap px-3 py-2 text-sm ${
      isActive ? "bg-black font-medium text-white" : "text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-black text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/admin" className="font-bold tracking-tight">
            Kamai <span className="font-normal text-neutral-400">Admin</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-neutral-300 sm:inline">{user.name}</span>
            <Link to="/" className="text-neutral-300 hover:text-white">
              Lihat toko
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="text-neutral-300 hover:text-white"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl gap-6 px-4 py-6 md:grid md:grid-cols-[200px_1fr]">
        <nav className="mb-4 flex gap-1 overflow-x-auto md:mb-0 md:block md:space-y-1" aria-label="Menu admin">
          {NAV.map((item) =>
            item.ready ? (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ) : (
              <span
                key={item.to}
                title="Segera tersedia"
                className="block cursor-not-allowed whitespace-nowrap px-3 py-2 text-sm text-neutral-400"
              >
                {item.label} <span className="text-xs">(segera)</span>
              </span>
            )
          )}
        </nav>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}