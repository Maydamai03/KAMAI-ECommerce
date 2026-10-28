import type { ReactNode } from "react";
import StaticPage from "../../components/StaticPage";
import { useStoreInfo } from "../../hooks/useStoreInfo";
import { mapsLink, waLink } from "../../lib/contact";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-neutral-200 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function ContactPage() {
  const { data: store, isLoading } = useStoreInfo();
  const name = store?.name ?? "Kamai";
  const hasAny = Boolean(store?.email || store?.phone || store?.whatsapp || store?.address || store?.hours);

  return (
    <StaticPage title="Kontak" intro={`Ada pertanyaan tentang produk atau pesananmu? Hubungi tim ${name}.`}>
      {isLoading && <p className="text-sm text-neutral-500">Memuat...</p>}

      {!isLoading && !hasAny && (
        <p className="text-sm text-neutral-600">Informasi kontak belum tersedia.</p>
      )}

      {hasAny && (
        <div className="grid gap-4 sm:grid-cols-2">
          {store?.whatsapp && (
            <Card title="WhatsApp">
              <p>{store.whatsapp}</p>
              <a
                href={waLink(store.whatsapp, `Halo ${name}, saya ingin bertanya.`)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Chat sekarang
              </a>
            </Card>
          )}

          {store?.email && (
            <Card title="Email">
              <a href={`mailto:${store.email}`} className="underline">
                {store.email}
              </a>
            </Card>
          )}

          {store?.phone && (
            <Card title="Telepon">
              <a href={`tel:${store.phone}`} className="underline">
                {store.phone}
              </a>
            </Card>
          )}

          {store?.hours && (
            <Card title="Jam layanan">
              <p>{store.hours}</p>
            </Card>
          )}

          {store?.address && (
            <Card title="Alamat">
              <p>{store.address}</p>
              <a
                href={mapsLink(store.address)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block underline"
              >
                Buka di peta
              </a>
            </Card>
          )}
        </div>
      )}
    </StaticPage>
  );
}