import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TtlCache } from "../lib/ttlCache";
import { mailConfig } from "../config/mail";
import { blankToUndefined } from "../lib/slug";
import { AppError } from "../lib/errors";
import { detectImageType } from "../lib/imageType";
import { getStorage, removeStoredImage } from "../storage";

const PHONE = /^(\+62|62|0)8[0-9]{7,12}$/;

export const optionalPhone = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(PHONE, "Nomor tidak valid (contoh: 08123456789)").optional()
);

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(60),
  email: z.preprocess(
    blankToUndefined,
    z.string().trim().toLowerCase().email("Format email tidak valid").optional()
  ),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  address: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
  hours: z.preprocess(blankToUndefined, z.string().trim().max(120).optional()),
});

export type StoreProfile = z.infer<typeof profileSchema>;

const cache = new TtlCache<StoreProfile>(60_000, 1);
const publicCache = new TtlCache<StoreProfile & { logoUrl: string | null }>(60_000, 1);
const LOGO_KEY = "store_logo";

export async function getStoreProfile(): Promise<StoreProfile> {
  const hit = cache.get("profile");
  if (hit) return hit;

  const row = await prisma.storeSetting.findUnique({ where: { key: "store_profile" } });
  const parsed = profileSchema.safeParse(row?.value ?? {});
  const profile: StoreProfile = parsed.success ? parsed.data : { name: mailConfig.brand };

  cache.set("profile", profile);
  return profile;
}

export async function saveStoreProfile(input: StoreProfile): Promise<StoreProfile> {
  const value = JSON.parse(JSON.stringify(input));
  await prisma.storeSetting.upsert({
    where: { key: "store_profile" },
    update: { value },
    create: { key: "store_profile", value },
  });
  cache.clear();
  publicCache.clear();  return input;
}

async function readLogo(): Promise<{ url: string; publicId: string } | null> {
  const row = await prisma.storeSetting.findUnique({ where: { key: LOGO_KEY } });
  const v = row?.value as { url?: string; publicId?: string } | null | undefined;
  return v?.url && v.publicId ? { url: v.url, publicId: v.publicId } : null;
}

export async function getLogoUrl(): Promise<string | null> {
  return (await readLogo())?.url ?? null;
}

/** Profil toko + logo, untuk tampilan publik */
export async function getPublicStore() {
  const hit = publicCache.get("store");
  if (hit) return hit;

  const [profile, logo] = await Promise.all([getStoreProfile(), readLogo()]);
  const result = { ...profile, logoUrl: logo?.url ?? null };
  publicCache.set("store", result);
  return result;
}

export async function setStoreLogo(file: Express.Multer.File | undefined): Promise<string> {
  if (!file) throw new AppError(400, "NO_FILE", "Pilih gambar logo.");

  const kind = detectImageType(file.buffer);
  if (!kind) {
    throw new AppError(400, "INVALID_IMAGE", "Berkas bukan gambar JPEG, PNG, atau WebP yang valid.");
  }

  const previous = await readLogo();
  const stored = await getStorage().save({
    buffer: file.buffer,
    ext: kind.ext,
    mime: kind.mime,
    folder: "branding",
  });

  try {
    const value = { url: stored.url, publicId: stored.publicId };
    await prisma.storeSetting.upsert({
      where: { key: LOGO_KEY },
      update: { value },
      create: { key: LOGO_KEY, value },
    });
  } catch (e) {
    await removeStoredImage(stored.publicId); // jangan tinggalkan berkas yatim
    throw e;
  }

  publicCache.clear();
  if (previous) await removeStoredImage(previous.publicId);
  return stored.url;
}

export async function removeStoreLogo(): Promise<void> {
  const previous = await readLogo();
  await prisma.storeSetting.deleteMany({ where: { key: LOGO_KEY } });
  publicCache.clear();
  if (previous) await removeStoredImage(previous.publicId);
}