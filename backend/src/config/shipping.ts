import "dotenv/config";

export const shippingConfig = {
  provider: process.env.SHIPPING_PROVIDER?.trim() || "mock",
};