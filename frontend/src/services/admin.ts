import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiUpload } from "../lib/api";
import type {
  AdminCategory,
  AdminDashboard,
  AdminProductDetail,
  AdminProductInput,
  AdminProductListItem,
  AdminProductSaveResult,
  Pagination,
  AdminImage,
} from "../types";

export const getAdminDashboard = () => apiGet<AdminDashboard>("/admin/dashboard");

/* Kategori */
export const getAdminCategories = () => apiGet<AdminCategory[]>("/admin/categories");
export const createCategory = (input: { name: string; slug?: string }) =>
  apiPost<AdminCategory>("/admin/categories", input);
export const updateCategory = (id: string, input: { name: string; slug?: string }) =>
  apiPut<AdminCategory>(`/admin/categories/${id}`, input);
export const deleteCategory = (id: string) => apiDelete<null>(`/admin/categories/${id}`);

/* Produk */
export interface AdminProductsParams {
  q?: string;
  category?: string;
  status?: "all" | "active" | "inactive";
  page?: number;
  limit?: number;
}

export const getAdminProducts = (params: AdminProductsParams) =>
  apiGet<{ items: AdminProductListItem[]; pagination: Pagination }>(
    "/admin/products",
    params as Record<string, string | number | undefined>
  );
export const getAdminProduct = (id: string) => apiGet<AdminProductDetail>(`/admin/products/${id}`);
export const createProduct = (input: AdminProductInput) =>
  apiPost<AdminProductSaveResult>("/admin/products", input);
export const updateProduct = (id: string, input: AdminProductInput) =>
  apiPut<AdminProductSaveResult>(`/admin/products/${id}`, input);
export const setProductFlags = (id: string, flags: { isActive?: boolean; isFeatured?: boolean }) =>
  apiPatch<null>(`/admin/products/${id}/flags`, flags);
export const deleteProduct = (id: string) => apiDelete<null>(`/admin/products/${id}`);

/* Gambar produk */
export const uploadProductImages = (id: string, files: File[]) => {
  const form = new FormData();
  files.forEach((file) => form.append("images", file));
  return apiUpload<AdminImage[]>(`/admin/products/${id}/images`, form);
};
export const reorderProductImages = (id: string, imageIds: string[]) =>
  apiPut<AdminImage[]>(`/admin/products/${id}/images/order`, { imageIds });
export const deleteProductImage = (id: string, imageId: string) =>
  apiDelete<AdminImage[]>(`/admin/products/${id}/images/${imageId}`);