import { useEffect } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!notFound) console.error(error);
  }, [error, notFound]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">{notFound ? "Halaman tidak ditemukan" : "Terjadi kesalahan"}</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {notFound
          ? "Alamat yang kamu tuju tidak tersedia."
          : "Maaf, ada yang tidak berjalan semestinya. Coba muat ulang halaman."}
      </p>
      {import.meta.env.DEV && !notFound && error instanceof Error && (
        <pre className="mt-4 max-w-full overflow-auto bg-neutral-100 p-3 text-left text-xs">{error.message}</pre>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="border border-black px-5 py-2 text-sm font-medium"
        >
          Muat ulang
        </button>
        <Link to="/" className="bg-black px-5 py-2 text-sm font-semibold text-white">
          Ke beranda
        </Link>
      </div>
    </div>
  );
}