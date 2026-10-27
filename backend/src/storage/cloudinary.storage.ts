import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { AppError } from "../lib/errors";
import { storageConfig } from "../config/storage";
import type { StorageProvider } from "./types";

let ready = false;

// Membaca CLOUDINARY_URL dari .env pada pemanggilan pertama
function init() {
  if (ready) return;
  cloudinary.config({ secure: true });
  if (!cloudinary.config().cloud_name) {
    throw new AppError(
      500,
      "STORAGE_NOT_CONFIGURED",
      "Penyimpanan gambar belum dikonfigurasi (CLOUDINARY_URL belum terbaca)."
    );
  }
  ready = true;
}

const storageError = () =>
  new AppError(502, "STORAGE_ERROR", "Gagal mengunggah gambar ke penyimpanan. Coba lagi.");

export const cloudinaryStorageProvider: StorageProvider = {
  name: "cloudinary",

  async save({ buffer }) {
    init();
    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: storageConfig.cloudinaryFolder,
              resource_type: "image",
              unique_filename: true,
              overwrite: false,
            },
            (err, res) => (err || !res ? reject(err ?? new Error("Unggah gagal")) : resolve(res))
          )
          .end(buffer);
      });

      return {
        // f_auto,q_auto: Cloudinary memilih format dan kualitas terbaik per pengunjung
        url: result.secure_url.replace("/upload/", "/upload/f_auto,q_auto/"),
        publicId: result.public_id,
      };
    } catch (e) {
      if (e instanceof AppError) throw e;
      console.error("[cloudinary] gagal mengunggah:", e);
      throw storageError();
    }
  },

  async remove(publicId) {
    init();
    await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  },
};