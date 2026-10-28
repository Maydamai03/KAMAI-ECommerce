import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { storageConfig } from "../config/storage";
import type { StorageProvider } from "./types";

export const LOCAL_PREFIX = "local/";

export const localStorageProvider: StorageProvider = {
  name: "local",

  async save({ buffer, ext, folder = "products" }) {
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(storageConfig.uploadDir, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    return {
      url: `${storageConfig.publicApiUrl}/uploads/${folder}/${filename}`,
      publicId: `${LOCAL_PREFIX}${folder}/${filename}`,
    };
  },

  async remove(publicId) {
    const relative = publicId.slice(LOCAL_PREFIX.length);
    const target = path.resolve(storageConfig.uploadDir, relative);
    const root = path.resolve(storageConfig.uploadDir) + path.sep;
    if (!target.startsWith(root)) return; // jangan keluar dari folder unggahan
    try {
      await unlink(target);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  },
};