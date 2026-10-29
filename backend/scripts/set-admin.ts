import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

const DEFAULT_ADMIN = "admin@tokobaju.test";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Admin";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!email || !password) fail("Isi ADMIN_EMAIL dan ADMIN_PASSWORD (variabel lingkungan) sebelum menjalankan skrip.");
if (!/^\S+@\S+\.\S+$/.test(email)) fail("ADMIN_EMAIL tidak valid.");
if (email === DEFAULT_ADMIN) fail("Gunakan email admin yang sebenarnya, bukan akun bawaan.");
if (password.length < 12) fail("Password admin minimal 12 karakter.");
if (Buffer.byteLength(password) > 72) fail("Password terlalu panjang (maksimal 72 byte).");
if (/^(admin12345!?|password|12345678)/i.test(password)) fail("Password terlalu mudah ditebak.");

const passwordHash = await bcrypt.hash(password, 12);

const admin = await prisma.user.upsert({
  where: { email },
  update: { name, passwordHash, role: "ADMIN", passwordChangedAt: new Date() },
  create: { name, email, passwordHash, role: "ADMIN" },
  select: { id: true, email: true },
});
console.log(`Akun admin siap: ${admin.email}`);

if (process.env.REMOVE_DEFAULT === "true") {
  const removed = await prisma.user.deleteMany({ where: { email: DEFAULT_ADMIN } });
  console.log(
    removed.count > 0 ? `Akun bawaan ${DEFAULT_ADMIN} dihapus.` : `Akun bawaan ${DEFAULT_ADMIN} tidak ditemukan.`
  );
}

await prisma.$disconnect();