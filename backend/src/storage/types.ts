export type StorageFolder = "products" | "banners";

export interface StoredImage {
  url: string;
  publicId: string;
}

export interface StorageProvider {
  name: "local" | "cloudinary";
  save(file: { buffer: Buffer; ext: string; mime: string; folder?: StorageFolder }): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
}