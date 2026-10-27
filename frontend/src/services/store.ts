import { apiGet } from "../lib/api";
import type { StoreProfile } from "../types";

export const getStoreInfo = () => apiGet<StoreProfile>("/store");