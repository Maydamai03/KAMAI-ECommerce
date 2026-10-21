export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  isFeatured: boolean;
  category: { name: string; slug: string };
  image: string | null;
  hoverImage: string | null;
  inStock: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  weightGram: number;
  category: { name: string; slug: string };
  images: { id: string; url: string; isPrimary: boolean }[];
  variants: ProductVariant[];
}

export interface FilterOptions {
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CUSTOMER" | "ADMIN";
}

export type CartLineData =
  | { available: false; variantId: string }
  | {
      available: true;
      variantId: string;
      productId: string;
      slug: string;
      name: string;
      color: string;
      size: string;
      image: string | null;
      unitPrice: number;
      weightGram: number;
      stock: number;
    };

export interface CartValidation {
  lines: CartLineData[];
  subtotal: number;
  totalWeightGram: number;
  valid: boolean;
}

export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  note: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  note?: string;
  isDefault?: boolean;
}

export interface AddressFormValues {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  note: string;
  isDefault: boolean;
  email: string;
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export interface OrderItemView {
  id: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderShippingAddress {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  street: string;
  note: string | null;
}

export interface Order {
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  expiresAt: string;
  createdAt: string;
  email: string | null;
  notes: string | null;
  shippingAddress: OrderShippingAddress;
  items: OrderItemView[];
}