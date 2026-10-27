export interface ShippingArea {
  id: string;
  label: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
}

/** Titik asal atau tujuan. Area ID lebih akurat, kode pos sebagai cadangan */
export interface ShippingPoint {
  areaId?: string;
  postalCode: string;
}

export interface RateQuery {
  origin: ShippingPoint;
  destination: ShippingPoint;
  weightGram: number;
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

export interface ShippingProvider {
  name: string;
  searchAreas(query: string): Promise<ShippingArea[]>;
  getRates(query: RateQuery): Promise<ShippingRate[]>;
}