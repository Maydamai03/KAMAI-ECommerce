import { useStoreInfo } from "../hooks/useStoreInfo";

export default function Footer() {
  const { data: store } = useStoreInfo();
  const name = store?.name ?? "Kamai";
  const whatsapp = store?.whatsapp
    ? store.whatsapp.replace(/\D/g, "").replace(/^0/, "62")
    : null;

  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-neutral-500">
        <p className="font-semibold text-neutral-900">{name}</p>
        {store?.address && <p className="mt-1 max-w-md">{store.address}</p>}

        {(store?.email || store?.phone || whatsapp) && (
          <ul className="mt-3 space-y-1">
            {store?.email && (
              <li>
                Email:{" "}
                <a href={`mailto:${store.email}`} className="underline hover:text-black">
                  {store.email}
                </a>
              </li>
            )}
            {store?.phone && (
              <li>
                Telepon:{" "}
                <a href={`tel:${store.phone}`} className="underline hover:text-black">
                  {store.phone}
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                WhatsApp:{" "}
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-black"
                >
                  {store?.whatsapp}
                </a>
              </li>
            )}
          </ul>
        )}

        <p className="mt-4">
          &copy; {new Date().getFullYear()} {name}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}