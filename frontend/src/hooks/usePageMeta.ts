import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStoreInfo } from "./useStoreInfo";

const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? "").replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  const base = SITE_URL || window.location.origin;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface SeoOptions {
  title: string;
  description?: string;
  image?: string | null;
  /** Alamat kanonis (boleh memuat query). Bawaannya: alamat halaman tanpa query */
  path?: string;
  type?: "website" | "product";
  /** Mis. "noindex, nofollow" atau "noindex, follow" */
  robots?: string;
}

export function useSeo({ title, description, image, path, type = "website", robots }: SeoOptions) {
  const { pathname } = useLocation();
  const canonicalPath = path ?? pathname;

  useEffect(() => {
    const undo: Array<() => void> = [];

    const previousTitle = document.title;
    document.title = title;
    undo.push(() => {
      document.title = previousTitle;
    });

    const setMeta = (attr: "name" | "property", key: string, content?: string | null) => {
      if (!content) return;
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (existing) {
        const previous = existing.getAttribute("content");
        existing.setAttribute("content", content);
        undo.push(() => {
          if (previous === null) existing.removeAttribute("content");
          else existing.setAttribute("content", previous);
        });
        return;
      }
      const created = document.createElement("meta");
      created.setAttribute(attr, key);
      created.setAttribute("content", content);
      document.head.appendChild(created);
      undo.push(() => created.remove());
    };

    const canonicalUrl = absoluteUrl(canonicalPath);
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta("name", "robots", robots);

    const existingLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (existingLink) {
      const previous = existingLink.getAttribute("href");
      existingLink.setAttribute("href", canonicalUrl);
      undo.push(() => {
        if (previous === null) existingLink.removeAttribute("href");
        else existingLink.setAttribute("href", previous);
      });
    } else {
      const link = document.createElement("link");
      link.rel = "canonical";
      link.href = canonicalUrl;
      document.head.appendChild(link);
      undo.push(() => link.remove());
    }

    return () => undo.reverse().forEach((fn) => fn());
  }, [title, description, image, canonicalPath, type, robots]);
}

/** Kompatibel dengan pemakaian lama (halaman statis) */
export function usePageMeta(title: string, description?: string) {
  useSeo({ title, description });
}

/** Halaman pribadi (keranjang, checkout, akun, admin): tidak boleh diindeks mesin pencari */
export function usePrivatePage(title: string) {
  const { data: store } = useStoreInfo();
  useSeo({ title: `${title} | ${store?.name ?? "Kamai"}`, robots: "noindex, nofollow" });
}

/** Data terstruktur schema.org. "<" di-escape agar isi tidak bisa menutup tag script */
export function useJsonLd(data: object | null) {
  const json = data ? JSON.stringify(data).replace(/</g, "\\u003c") : null;

  useEffect(() => {
    if (!json) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [json]);
}