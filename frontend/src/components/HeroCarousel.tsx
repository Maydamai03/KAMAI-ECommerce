import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStoreInfo } from "../hooks/useStoreInfo";
import { getBanners } from "../services/store";
import type { PublicBanner } from "../types";

const INTERVAL_MS = 6000;
const HEIGHT = "h-[360px] sm:h-[440px] lg:h-[520px]";

function Cta({ banner, tabIndex }: { banner: PublicBanner; tabIndex: number }) {
  if (!banner.buttonLabel || !banner.linkUrl) return null;
  const cls = "mt-6 inline-block bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-200";

  if (banner.linkUrl.startsWith("/")) {
    return (
      <Link to={banner.linkUrl} tabIndex={tabIndex} className={cls}>
        {banner.buttonLabel}
      </Link>
    );
  }
  return (
    <a href={banner.linkUrl} tabIndex={tabIndex} target="_blank" rel="noreferrer noopener" className={cls}>
      {banner.buttonLabel}
    </a>
  );
}

function FallbackHero() {
  return (
    <section className="bg-neutral-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
        <p className="text-sm uppercase tracking-widest text-neutral-400">Koleksi Terbaru</p>
        <h1 className="mt-3 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
          Gaya santai untuk setiap hari.
        </h1>
        <Link
          to="/products"
          className="mt-8 inline-block bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-200"
        >
          Belanja Sekarang
        </Link>
      </div>
    </section>
  );
}

export default function HeroCarousel() {
  const { data: store } = useStoreInfo();
  const banners = useQuery({
    queryKey: ["banners"],
    queryFn: getBanners,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const list = banners.data ?? [];
  const count = list.length;
  const current = count > 0 ? Math.min(index, count - 1) : 0;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (Math.min(i, count - 1) + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [count, paused, current]);

  if (banners.isLoading) return <div className={`${HEIGHT} bg-neutral-900`} aria-hidden="true" />;
  if (count === 0) return <FallbackHero />;

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Banner promosi"
      className={`relative overflow-hidden bg-black ${HEIGHT}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
      }}
    >
      <h1 className="sr-only">{store?.name ?? "Kamai"}</h1>

      {list.map((b, i) => {
        const active = i === current;
        const hasText = Boolean(b.title || b.subtitle || (b.buttonLabel && b.linkUrl));

        return (
          <div
            key={b.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} dari ${count}`}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
              active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img
              src={b.url}
              alt={b.title ?? ""}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover object-center"
            />

            {hasText && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-center">
                  <div className="mx-auto w-full max-w-7xl px-4">
                    <div className="max-w-xl text-white">
                      {b.title && (
                        <p className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{b.title}</p>
                      )}
                      {b.subtitle && (
                        <p className="mt-3 text-sm text-neutral-200 sm:text-base">{b.subtitle}</p>
                      )}
                      <Cta banner={b} tabIndex={active ? 0 : -1} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Banner sebelumnya"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 px-3 py-2 text-xl text-white hover:bg-black/70"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Banner berikutnya"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 px-3 py-2 text-xl text-white hover:bg-black/70"
          >
            &rarr;
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {list.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Tampilkan banner ${i + 1}`}
                aria-current={i === current}
                className={`h-2 w-8 transition-colors ${i === current ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}