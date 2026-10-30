import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diisi di .env");
}

// Pool kecil dan koneksi menganggur cepat dilepas: database serverless (Neon) menidurkan diri,
// dan koneksi basi di pool bisa menggagalkan permintaan pertama setelah bangun.
const adapter = new PrismaPg({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
});

export const prisma = new PrismaClient({ adapter });