import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useStoreInfo } from "../hooks/useStoreInfo";
import { ArrowRightIcon, CloseIcon } from "./icons";

const MENU = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Shop", end: false },
  { to: "/about", label: "About Us", end: false },
  { to: "/contact", label: "Contact", end: false },
  { to: "/faq", label: "FAQ", end: false },
  { to: "/policy", label: "Shipping & Returns", end: false },
  { to: "/privacy", label: "Privacy & Terms", end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between rounded-xl px-4 py-3 text-base transition-colors ${
    isActive ? "bg-black font-semibold text-white" : "text-neutral-800 hover:bg-neutral-100"
  }`;

export default function MenuPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { data: store } = useStoreInfo();

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <p className="text-sm font-semibold uppercase tracking-widest">Menu</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          className="rounded-full p-2 transition-colors hover:bg-neutral-100"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu utama">
        <ul className="space-y-1">
          {MENU.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} onClick={onClose} className={linkClass}>
                {item.label}
                <ArrowRightIcon className="h-4 w-4 opacity-60" />
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="my-4 border-t border-neutral-200" />

        <ul className="space-y-1">
          <li>
            <NavLink to="/account" onClick={onClose} className={linkClass}>
              My Account
              <ArrowRightIcon className="h-4 w-4 opacity-60" />
            </NavLink>
          </li>
          {user?.role === "ADMIN" && (
            <li>
              <NavLink to="/admin" onClick={onClose} className={linkClass}>
                Admin Panel
                <ArrowRightIcon className="h-4 w-4 opacity-60" />
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="border-t border-neutral-200 px-5 py-4 text-xs text-neutral-500">
        {store?.name ?? "Kamai"}
      </div>
    </>
  );
}