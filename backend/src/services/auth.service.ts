import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP tidak valid")
    .optional(),
  // bcrypt hanya memproses 72 byte pertama
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

const publicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
} as const;

// Dipakai agar waktu respons login tidak membocorkan apakah email terdaftar
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError(409, "EMAIL_TAKEN", "Email sudah terdaftar");

  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: "CUSTOMER",
      },
      select: publicSelect,
    });
  } catch (e) {
    // Dua pendaftaran bersamaan dengan email sama
    if ((e as { code?: string }).code === "P2002") {
      throw new AppError(409, "EMAIL_TAKEN", "Email sudah terdaftar");
    }
    throw e;
  }
}

export async function loginUser(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}