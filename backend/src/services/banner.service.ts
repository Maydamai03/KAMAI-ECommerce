import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { detectImageType } from "../lib/imageType";
import { blankToUndefined } from "../lib/slug";
import { getStorage, removeStoredImage } from "../storage";

export const MAX_BANNERS = 6;
const KEY = "home_banners";

type Db = Pick<Prisma.TransactionClient, "storeSetting">;

/* ------------------------------------------------------------------ */
/* Skema                                                               */
/* ------------------------------------------------------------------ */

const optText = (max: number) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

// Hanya alamat internal (diawali satu "/") atau URL http(s); menolak "//", "\" dan "javascript:"
const linkField = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .max(300)
    .regex(
      /^(\/(?![\/\\])[^\s\\]*|https?:\/\/[^\s\\]+)$/i,
      "Tautan harus berupa alamat internal (diawali /) atau URL lengkap (https://...)"
    )
    .optional()
);

const shape = {
  title: optText(80),
  subtitle: optText(160),
  buttonLabel: optText(30),
  linkUrl: linkField,
};

function linkProblem(v: { buttonLabel?: string; linkUrl?: string }) {
  if (v.linkUrl && !v.buttonLabel) {
    return { message: "Teks tombol wajib diisi jika tautan diisi", path: ["buttonLabel"] };
  }
  if (v.buttonLabel && !v.linkUrl) {
    return { message: "Tautan wajib diisi jika teks tombol diisi", path: ["linkUrl"] };
  }
  return null;
}

export const bannerCreateSchema = z.object(shape).superRefine((v, ctx) => {
  const problem = linkProblem(v);
  if (problem) ctx.addIssue({ code: "custom", ...problem });
});

export const bannersUpdateSchema = z.object({
  banners: z
    .array(
      z
        .object({ id: z.string().min(1).max(60), isActive: z.boolean(), ...shape })
        .superRefine((v, ctx) => {
          const problem = linkProblem(v);
          if (problem) ctx.addIssue({ code: "custom", ...problem });
        })
    )
    .max(MAX_BANNERS),
});

const storedSchema = z.object({
  banners: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      publicId: z.string(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      buttonLabel: z.string().optional(),
      linkUrl: z.string().optional(),
      isActive: z.boolean().default(true),
    })
  ),
});

type Banner = z.infer<typeof storedSchema>["banners"][number];

/* ------------------------------------------------------------------ */
/* Baca dan tulis                                                      */
/* ------------------------------------------------------------------ */

async function readBanners(db: Db): Promise<Banner[]> {
  const row = await db.storeSetting.findUnique({ where: { key: KEY } });
  if (!row) return [];
  const parsed = storedSchema.safeParse(row.value);
  if (!parsed.success) {
    console.error("[banner] data banner tersimpan tidak valid:", parsed.error.issues);
    return [];
  }
  return parsed.data.banners;
}

async function writeBanners(db: Db, banners: Banner[]) {
  const value = JSON.parse(JSON.stringify({ banners }));
  await db.storeSetting.upsert({
    where: { key: KEY },
    update: { value },
    create: { key: KEY, value },
  });
}

// Operasi tulis dijalankan bergantian (kunci advisory), supaya dua perubahan bersamaan tidak saling menimpa
async function locked<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('home_banners'))) AS t`;
      return fn(tx);
    },
    { timeout: 15_000 }
  );
}

/* ------------------------------------------------------------------ */
/* Publik                                                              */
/* ------------------------------------------------------------------ */

export async function listPublicBanners() {
  const banners = await readBanners(prisma);
  return banners
    .filter((b) => b.isActive)
    .map((b) => ({
      id: b.id,
      url: b.url,
      title: b.title ?? null,
      subtitle: b.subtitle ?? null,
      buttonLabel: b.buttonLabel ?? null,
      linkUrl: b.linkUrl ?? null,
    }));
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export async function listAdminBanners() {
  const banners = await readBanners(prisma);
  return banners.map(({ publicId: _publicId, ...rest }) => rest);
}

export async function createBanner(
  file: Express.Multer.File | undefined,
  input: z.infer<typeof bannerCreateSchema>
) {
  if (!file) throw new AppError(400, "NO_FILE", "Pilih gambar banner.");

  const kind = detectImageType(file.buffer);
  if (!kind) {
    throw new AppError(400, "INVALID_IMAGE", "Berkas bukan gambar JPEG, PNG, atau WebP yang valid.");
  }

  const existing = await readBanners(prisma);
  if (existing.length >= MAX_BANNERS) {
    throw new AppError(400, "BANNER_LIMIT", `Maksimal ${MAX_BANNERS} banner. Hapus salah satu dulu.`);
  }

  const stored = await getStorage().save({
    buffer: file.buffer,
    ext: kind.ext,
    mime: kind.mime,
    folder: "banners",
  });

  try {
    await locked(async (tx) => {
      const list = await readBanners(tx);
      if (list.length >= MAX_BANNERS) {
        throw new AppError(400, "BANNER_LIMIT", `Maksimal ${MAX_BANNERS} banner. Hapus salah satu dulu.`);
      }
      list.push({
        id: randomUUID(),
        url: stored.url,
        publicId: stored.publicId,
        ...input,
        isActive: true,
      });
      await writeBanners(tx, list);
    });
  } catch (e) {
    await removeStoredImage(stored.publicId); // jangan tinggalkan berkas yatim
    throw e;
  }

  return listAdminBanners();
}

export async function updateBanners(items: z.infer<typeof bannersUpdateSchema>["banners"]) {
  await locked(async (tx) => {
    const list = await readBanners(tx);

    const sameSet =
      items.length === list.length &&
      new Set(items.map((i) => i.id)).size === items.length &&
      items.every((i) => list.some((b) => b.id === i.id));
    if (!sameSet) {
      throw new AppError(
        409,
        "BANNERS_CHANGED",
        "Daftar banner sudah berubah. Muat ulang halaman lalu coba lagi."
      );
    }

    const byId = new Map(list.map((b) => [b.id, b]));
    const next: Banner[] = items.map((i) => {
      const old = byId.get(i.id) as Banner;
      return {
        id: old.id,
        url: old.url,
        publicId: old.publicId,
        title: i.title,
        subtitle: i.subtitle,
        buttonLabel: i.buttonLabel,
        linkUrl: i.linkUrl,
        isActive: i.isActive,
      };
    });
    await writeBanners(tx, next);
  });

  return listAdminBanners();
}

export async function deleteBanner(id: string) {
  const removed = await locked(async (tx) => {
    const list = await readBanners(tx);
    const found = list.find((b) => b.id === id);
    if (!found) throw new AppError(404, "BANNER_NOT_FOUND", "Banner tidak ditemukan");
    await writeBanners(
      tx,
      list.filter((b) => b.id !== id)
    );
    return found;
  });

  // Berkas dihapus setelah database berhasil diperbarui
  await removeStoredImage(removed.publicId);
  return listAdminBanners();
}