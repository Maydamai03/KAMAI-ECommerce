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
  AdminOrderDetail, 
  AdminOrderList, 
  AdminOrderTarget, 
  OrderStatus,
  RevenueRange, 
  RevenueSeries,
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

/* Pesanan */
export const getAdminOrders = (params: {
  status?: OrderStatus;
  q?: string;
  page?: number;
  limit?: number;
}) => apiGet<AdminOrderList>("/admin/orders", params as Record<string, string | number | undefined>);

export const getAdminOrder = (orderNumber: string) =>
  apiGet<AdminOrderDetail>(`/admin/orders/${orderNumber}`);

export const changeOrderStatus = (
  orderNumber: string,
  body: { status: AdminOrderTarget; note?: string; trackingNumber?: string; courier?: string }
) => apiPatch<AdminOrderDetail>(`/admin/orders/${orderNumber}/status`, body);

export const addOrderNote = (orderNumber: string, note: string) =>
  apiPost<AdminOrderDetail>(`/admin/orders/${orderNumber}/notes`, { note });

export const updateShipment = (orderNumber: string, body: { trackingNumber: string; courier?: string }) =>
  apiPut<AdminOrderDetail>(`/admin/orders/${orderNumber}/shipment`, body);

export const getAdminRevenue = (range: RevenueRange) =>
  apiGet<RevenueSeries>("/admin/revenue", { range });