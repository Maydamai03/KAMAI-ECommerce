import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { COOKIE_NAME, verifyToken } from "../lib/jwt";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      throw new AppError(401, "UNAUTHORIZED", "Silakan login terlebih dahulu");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
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
    const token = req.cookies?.[COOKIE_NAME];
    const payload = token ? verifyToken(token) : null;
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });
      if (user) req.user = user;
    }
    next();
  } catch (e) {
    next(e);
  }
};