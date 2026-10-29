import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { COOKIE_NAME, verifyToken } from "../lib/jwt";

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  passwordChangedAt: true,
} as const;

async function resolveUser(token: string | undefined) {
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;

  const row = await prisma.user.findUnique({ where: { id: payload.sub }, select: userSelect });
  if (!row) return null;

  // Token yang dibuat sebelum password diganti tidak berlaku lagi
  if (row.passwordChangedAt && payload.iat < Math.floor(row.passwordChangedAt.getTime() / 1000)) {
    return null;
  }

  const { passwordChangedAt: _ignored, ...user } = row;
  return user;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const user = await resolveUser(req.cookies?.[COOKIE_NAME]);
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Silakan login terlebih dahulu");
    }
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
};

// Pakai setelah requireAuth
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "ADMIN") {
    return next(new AppError(403, "FORBIDDEN", "Akses ditolak"));
  }
  next();
};

// Tidak menolak tamu; hanya mengisi req.user kalau cookie valid
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const user = await resolveUser(req.cookies?.[COOKIE_NAME]);
    if (user) req.user = user;
    next();
  } catch (e) {
    next(e);
  }
};