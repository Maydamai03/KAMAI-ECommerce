export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-neutral-500">
        <p className="font-semibold text-neutral-900">KAMAI</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} KAMAI. Seluruh hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}