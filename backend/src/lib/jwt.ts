import jwt from "jsonwebtoken";

export const COOKIE_NAME = "token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET belum diisi atau kurang dari 32 karakter");
  }
  return secret;
}

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ role: user.role }, getSecret(), {
    subject: user.id,
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): { sub: string; iat: number } | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "string" || !payload.sub) return null;
    return { sub: payload.sub, iat: typeof payload.iat === "number" ? payload.iat : 0 };
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === "production";
const sameSiteEnv = process.env.COOKIE_SAMESITE?.trim().toLowerCase();
const sameSite = (sameSiteEnv === "strict" || sameSiteEnv === "none" ? sameSiteEnv : "lax") as
  | "lax"
  | "strict"
  | "none";

export const cookieOptions = {
  httpOnly: true,
  secure: isProd || sameSite === "none", // SameSite=None mewajibkan Secure
  sameSite,
  maxAge: MAX_AGE_MS,
  path: "/",
};