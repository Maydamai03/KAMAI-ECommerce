import { apiDelete, apiGet, apiPost, apiPut } from "../lib/api";
import type { Address, AddressInput } from "../types";

export const getAddresses = () => apiGet<Address[]>("/me/addresses");
export const createAddress = (input: AddressInput) => apiPost<Address>("/me/addresses", input);
export const updateAddress = (id: string, input: AddressInput) =>
  apiPut<Address>(`/me/addresses/${id}`, input);
export const deleteAddress = (id: string) => apiDelete<null>(`/me/addresses/${id}`);