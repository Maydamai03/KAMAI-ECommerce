import { apiGet, apiPost } from "../lib/api";
import type { ShippingArea, ShippingRatesResponse } from "../types";

export const searchAreas = (q: string) => apiGet<ShippingArea[]>("/shipping/areas", { q });

export const getShippingRates = (input: {
  items: { variantId: string; quantity: number }[];
  areaId?: string;
  postalCode: string;
}) => apiPost<ShippingRatesResponse>("/shipping/rates", input);