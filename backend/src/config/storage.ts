import "dotenv/config";
import { fileURLToPath } from "node:url";

const port = process.env.PORT ?? "5000";

export const storageConfig = {
  mode: process.env.STORAGE?.trim() || "local",
  uploadDir: fileURLToPath(new URL("../../uploads", import.meta.url)),
  publicApiUrl: (process.env.PUBLIC_API_URL?.trim() || `http://localhost:${port}`).replace(/\/+$/, ""),
  cloudinaryFolder: (process.env.CLOUDINARY_FOLDER?.trim() || "kamai/products").replace(/^\/+|\/+$/g, ""),
  maxFileBytes: 5 * 1024 * 1024,
  maxImagesPerProduct: 8,
};