export interface StoredImage {
  url: string;
  publicId: string;
}

export interface StorageProvider {
  name: "local" | "cloudinary";
  save(file: { buffer: Buffer; ext: string; mime: string }): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
}