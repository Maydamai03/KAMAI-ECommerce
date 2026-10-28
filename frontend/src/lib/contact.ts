/** 0812... atau +62812... menjadi 62812... */
export function waNumber(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0/, "62");
}

export function waLink(raw: string, text?: string): string {
  const base = `https://wa.me/${waNumber(raw)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}