import type { Address, AddressFormValues, AddressInput } from "../types";

export function toAddressInput(v: AddressFormValues): AddressInput {
  return {
    recipientName: v.recipientName.trim(),
    phone: v.phone.trim(),
    province: v.province.trim(),
    city: v.city.trim(),
    district: v.district.trim(),
    postalCode: v.postalCode.trim(),
    street: v.street.trim(),
    areaId: v.areaId || undefined,
    // Kolom kosong dikirim sebagai undefined, bukan string kosong
    note: v.note.trim() || undefined,
    isDefault: v.isDefault,
  };
}

export function addressToInput(a: Address, isDefault = a.isDefault): AddressInput {
  return {
    recipientName: a.recipientName,
    phone: a.phone,
    province: a.province,
    city: a.city,
    district: a.district,
    postalCode: a.postalCode,
    street: a.street,
    areaId: a.areaId ?? undefined,
    note: a.note ?? undefined,
    isDefault,
  };
}