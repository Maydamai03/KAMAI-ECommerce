import "dotenv/config";
import { fileURLToPath } from "node:url";

const port = process.env.PORT ?? "5000";

const cloudinaryFolder = (process.env.CLOUDINARY_FOLDER?.trim() || "kamai/products").replace(/^\/+|\/+$/g, "");

export const storageConfig = {
  mode: process.env.STORAGE?.trim() || "local",
  uploadDir: fileURLToPath(new URL("../../uploads", import.meta.url)),
  publicApiUrl: (process.env.PUBLIC_API_URL?.trim() || `http://localhost:${port}`).replace(/\/+$/, ""),
  cloudinaryFolder,
  // Folder induk (segmen pertama), dipakai untuk produk dan banner
  cloudinaryRoot: cloudinaryFolder.split("/")[0],
  maxFileBytes: 5 * 1024 * 1024,
  maxImagesPerProduct: 8,
};