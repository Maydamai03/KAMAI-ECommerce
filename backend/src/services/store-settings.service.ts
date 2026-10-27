import { z } from "zod";
import { prisma } from "../lib/prisma";
import { TtlCache } from "../lib/ttlCache";
import { mailConfig } from "../config/mail";
import { blankToUndefined } from "../lib/slug";

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
});

export type StoreProfile = z.infer<typeof profileSchema>;

const cache = new TtlCache<StoreProfile>(60_000, 1);

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
  return input;
}