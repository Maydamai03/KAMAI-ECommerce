import { storageConfig } from "../config/storage";
import { cloudinaryStorageProvider } from "./cloudinary.storage";
import { LOCAL_PREFIX, localStorageProvider } from "./local.storage";
import type { StorageProvider } from "./types";

export function getStorage(): StorageProvider {
  if (storageConfig.mode === "cloudinary") return cloudinaryStorageProvider;
  if (storageConfig.mode === "local") return localStorageProvider;
  throw new Error(`STORAGE "${storageConfig.mode}" tidak dikenal (pilihan: local, cloudinary)`);
}

/**
 * Menghapus berkas berdasarkan asalnya, bukan mode saat ini, sehingga gambar yang
 * dibuat di mode lain tetap terhapus dengan benar. Tidak pernah melempar error.
 */
export async function removeStoredImage(publicId: string): Promise<void> {
  try {
    if (publicId.startsWith(LOCAL_PREFIX)) {
      await localStorageProvider.remove(publicId);
    } else if (publicId.startsWith(`${storageConfig.cloudinaryFolder}/`)) {
      await cloudinaryStorageProvider.remove(publicId);
    }
    // Selain itu (mis. gambar contoh dari seed) tidak ada berkas yang perlu dihapus
  } catch (e) {
    console.error(`[storage] gagal menghapus ${publicId}:`, e);
  }
}