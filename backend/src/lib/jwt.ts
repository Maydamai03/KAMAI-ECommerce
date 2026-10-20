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

export function verifyToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "string" || !payload.sub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === "production";

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  // Frontend dan backend di domain berbeda saat production butuh "none"
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  maxAge: MAX_AGE_MS,
  path: "/",
};