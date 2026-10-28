import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: "left" | "right";
  widthClass?: string;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const DURATION = 300;

export default function SideDrawer({ open, onClose, label, side = "left", widthClass = "max-w-sm", children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Pasang dulu, lalu jalankan animasi masuk; saat menutup, animasi keluar baru dilepas
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(timer);
  }, [open]);

  // Kunci gulir halaman, atur fokus, dan kembalikan fokus saat tertutup
  useEffect(() => {
    if (!mounted) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus?.();
    };
  }, [mounted]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;

    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (n) => n.offsetParent !== null
    );
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted) return null;

  const hiddenTransform = side === "left" ? "-translate-x-full" : "translate-x-full";

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 motion-reduce:transition-none ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`absolute top-0 flex h-full w-[88vw] ${widthClass} flex-col bg-white shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none ${
          side === "left" ? "left-0" : "right-0"
        } ${shown ? "translate-x-0" : hiddenTransform}`}
      >
        {children}
      </div>
    </div>
  );
}