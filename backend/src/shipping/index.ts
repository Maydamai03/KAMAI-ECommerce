import { shippingConfig } from "../config/shipping";
import { mockProvider } from "./mock.provider";
import type { ShippingProvider } from "./types";

export function getShippingProvider(): ShippingProvider {
  if (shippingConfig.provider === "mock") return mockProvider;
  throw new Error(
    `SHIPPING_PROVIDER "${shippingConfig.provider}" belum didukung (adapter Biteship dibuat di tahap 4C)`
  );
}