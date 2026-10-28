import { apiGet } from "../lib/api";
import type { PublicBanner, StoreProfile } from "../types";

export const getStoreInfo = () => apiGet<StoreProfile>("/store");
export const getBanners = () => apiGet<PublicBanner[]>("/banners");