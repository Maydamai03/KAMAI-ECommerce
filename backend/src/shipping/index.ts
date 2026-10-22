import { shippingConfig } from "../config/shipping";
import { manualProvider } from "./manual.provider";
import { mockProvider } from "./mock.provider";
import type { ShippingProvider } from "./types";

export function getShippingProvider(): ShippingProvider {
  switch (shippingConfig.provider) {
    case "manual":
      return manualProvider;
    case "mock":
      return mockProvider;
    default:
      throw new Error(
        `SHIPPING_PROVIDER "${shippingConfig.provider}" belum didukung (pilihan saat ini: manual, mock)`
      );
  }
}