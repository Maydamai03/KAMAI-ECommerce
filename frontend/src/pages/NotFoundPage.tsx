import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <Link to="/" className="mt-4 inline-block underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}