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
  areaId: string | null;
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
  areaId?: string;
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
  areaId: string;
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
  courierCompany: string | null;
  courierService: string | null;
  shipment: { courier: string; trackingNumber: string; shippedAt: string | null } | null;
  expiresAt: string;
  createdAt: string;
  email: string | null;
  notes: string | null;
  shippingAddress: OrderShippingAddress;
  items: OrderItemView[];
}

export interface OrderSummary {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  expiresAt: string;
  itemCount: number;
  preview: string[];
}

export interface ShippingArea {
  id: string;
  label: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
}

export interface ShippingRate {
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  price: number;
  etdMinDays: number;
  etdMaxDays: number;
  zone?: string;
}

export interface ShippingRatesResponse {
  weightGram: number;
  rates: ShippingRate[];
}

export interface AdminDashboard {
  ordersToday: number;
  needsProcessing: number;
  revenue7Days: number;
  productCount: number;
  customerCount: number;
  statusCounts: Record<OrderStatus, number>;
  revenueByDay: { date: string; total: number }[];
  lowStock: { id: string; productName: string; slug: string; variant: string; stock: number }[];
  recentOrders: {
    orderNumber: string;
    status: OrderStatus;
    total: number;
    createdAt: string;
    recipient: string;
  }[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string };
  basePrice: number;
  isActive: boolean;
  isFeatured: boolean;
  image: string | null;
  variantCount: number;
  totalStock: number;
}

export interface AdminVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  priceOverride: number | null;
  isActive: boolean;
  orderCount: number;
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  category: { id: string; name: string };
  basePrice: number;
  weightGram: number;
  isActive: boolean;
  isFeatured: boolean;
  images: { id: string; url: string; isPrimary: boolean }[];
  variants: AdminVariant[];
}

export interface AdminProductInput {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  basePrice: number;
  weightGram: number;
  isActive: boolean;
  isFeatured: boolean;
  variants: {
    id?: string;
    color: string;
    size: string;
    sku?: string;
    stock: number;
    expectedStock?: number;
    priceOverride: number | null;
    isActive: boolean;
  }[];
}

export interface AdminProductSaveResult {
  product: AdminProductDetail;
  warnings: string[];
}

export interface AdminImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface AdminOrderListItem {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  recipient: string;
  email: string | null;
  phone: string | null;
  itemCount: number;
  courier: string | null;
  trackingNumber: string | null;
}

export interface AdminOrderList {
  items: AdminOrderListItem[];
  pagination: Pagination;
  counts: Record<OrderStatus, number>;
}

export type AdminOrderTarget = "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";

export interface AdminOrderDetail {
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  expiresAt: string;
  email: string | null;
  phone: string | null;
  customer: { id: string; name: string; email: string } | null;
  customerNotes: string | null;
  address: OrderShippingAddress;
  courierCompany: string | null;
  courierService: string | null;
  items: OrderItemView[];
  payments: {
    id: string;
    method: string | null;
    status: "PENDING" | "SETTLEMENT" | "FAILED" | "EXPIRED" | "CANCELLED";
    grossAmount: number;
    paidAt: string | null;
    providerRef: string | null;
    fraudStatus: string | null;
  }[];
  shipment: {
    courier: string;
    trackingNumber: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  history: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    createdAt: string;
    actor: string | null;
  }[];
  nextStatuses: AdminOrderTarget[];
  paymentSettled: boolean;
  refundNeeded: boolean;
}

export type RevenueRange = "7d" | "30d" | "12m";

export interface RevenuePoint {
  key: string;
  total: number;
  orders: number;
}

export interface RevenueSeries {
  range: RevenueRange;
  buckets: RevenuePoint[];
  total: number;
  orders: number;
}

export interface StoreProfile {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  hours?: string;
  logoUrl?: string | null;
}

export interface StoreOrigin {
  name: string;
  areaId: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
  address: string;
  phone?: string;
}

export type RuleScope =
  | "same_city"
  | "same_province"
  | "same_island"
  | "city"
  | "province"
  | "island"
  | "default";

export interface ManualRule {
  scope: RuleScope;
  value?: string;
  firstKg: number;
  nextKg: number;
  etdMin: number;
  etdMax: number;
}

export interface ManualService {
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  maxWeightGram?: number;
  rules: ManualRule[];
}

export interface ManualConfig {
  services: ManualService[];
}

export interface AdminSettings {
  provider: string;
  profile: StoreProfile;
  origin: StoreOrigin | null;
  originProblem: string | null;
  manual: ManualConfig | null;
  manualError: string | null;
  logoUrl: string | null;
}

export interface PublicBanner {
  id: string;
  url: string;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  linkUrl: string | null;
}

export interface AdminBanner {
  id: string;
  url: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  linkUrl?: string;
  isActive: boolean;
}