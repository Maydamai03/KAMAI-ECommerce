import type { QueryClient } from "@tanstack/react-query";

/** Setelah data katalog berubah, segarkan semua tampilan yang memakainya */
export function invalidateCatalog(qc: QueryClient) {
  for (const key of [
    ["admin-products"],
    ["admin-product"],
    ["admin-categories"],
    ["admin-dashboard"],
    ["products"],
    ["product"],
    ["filter-options"],
    ["categories"],
    ["cart-validate"],
  ]) {
    qc.invalidateQueries({ queryKey: key });
  }
}