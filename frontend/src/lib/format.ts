export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatEtd(min: number, max: number): string {
  return min === max ? `${min} hari` : `${min}-${max} hari`;
}

/** Rp1,2 jt, Rp123 jt, Rp2,5 M, dst. Untuk label sumbu grafik */
export function formatRupiahCompact(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (abs >= 1_000_000_000) return `Rp${trim(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `Rp${trim(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `Rp${trim(value / 1_000)} rb`;
  return `Rp${Math.round(value)}`;
}