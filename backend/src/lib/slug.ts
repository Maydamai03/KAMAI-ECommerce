export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Untuk zod.preprocess: string kosong dianggap tidak diisi */
export const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Menambahkan -2, -3, dst. sampai slug belum dipakai */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let candidate = base;
  for (let i = 2; await exists(candidate); i++) {
    if (i > 50) throw new Error("Tidak dapat membuat slug unik");
    candidate = `${base}-${i}`;
  }
  return candidate;
}