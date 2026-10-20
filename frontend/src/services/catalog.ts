import { apiGet } from "../lib/api";
import type {
  Category,
  FilterOptions,
  Pagination,
  ProductDetail,
  ProductListItem,
} from "../types";

export interface ProductListParams {
  category?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  featured?: "true" | "false";
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export function getProducts(params: ProductListParams = {}) {
  return apiGet<{ items: ProductListItem[]; pagination: Pagination }>(
    "/products",
    params as Record<string, string | number | undefined>
  );
}

export function getProduct(slug: string) {
  return apiGet<ProductDetail>(`/products/${slug}`);
}

export function getCategories() {
  return apiGet<Category[]>("/categories");
}

export function getFilterOptions() {
  return apiGet<FilterOptions>("/products/filters");
}