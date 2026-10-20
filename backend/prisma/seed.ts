import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

const SIZES = ["S", "M", "L", "XL"];

const categories = [
  { name: "Atasan", slug: "atasan" },
  { name: "Bawahan", slug: "bawahan" },
  { name: "Outerwear", slug: "outerwear" },
];

const products = [
  { name: "Oversized Tee Basic", cat: "atasan", price: 129000, weight: 250, featured: true, colors: ["Hitam", "Putih"] },
  { name: "Boxy Shirt Linen", cat: "atasan", price: 199000, weight: 300, featured: true, colors: ["Krem", "Biru Muda"] },
  { name: "Graphic Tee Vintage", cat: "atasan", price: 149000, weight: 250, featured: false, colors: ["Hitam", "Abu"] },
  { name: "Polo Knit Classic", cat: "atasan", price: 229000, weight: 300, featured: false, colors: ["Navy", "Putih"] },
  { name: "Wide Leg Jeans", cat: "bawahan", price: 329000, weight: 700, featured: true, colors: ["Biru Tua", "Hitam"] },
  { name: "Cargo Pants Utility", cat: "bawahan", price: 299000, weight: 600, featured: false, colors: ["Hijau Army", "Krem"] },
  { name: "Chino Slim Fit", cat: "bawahan", price: 259000, weight: 500, featured: false, colors: ["Khaki", "Hitam"] },
  { name: "Jogger Sweatpants", cat: "bawahan", price: 219000, weight: 550, featured: false, colors: ["Abu", "Hitam"] },
  { name: "Denim Jacket Washed", cat: "outerwear", price: 449000, weight: 900, featured: true, colors: ["Biru Muda", "Hitam"] },
  { name: "Hoodie Fleece Heavy", cat: "outerwear", price: 349000, weight: 800, featured: true, colors: ["Hitam", "Abu"] },
  { name: "Coach Jacket", cat: "outerwear", price: 379000, weight: 600, featured: false, colors: ["Navy", "Hitam"] },
  { name: "Bomber Jacket Essential", cat: "outerwear", price: 429000, weight: 850, featured: false, colors: ["Hijau Army", "Hitam"] },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  // Admin
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tokobaju.test";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin12345!";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  // Kategori
  const categoryIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categoryIds[c.slug] = row.id;
  }

  // Produk (dilewati kalau slug sudah ada)
  for (const p of products) {
    const slug = slugify(p.name);
    const exists = await prisma.product.findUnique({ where: { slug } });
    if (exists) continue;

    const variants = p.colors.flatMap((color, ci) =>
      SIZES.map((size, si) => ({
        sku: `${slug}-${slugify(color)}-${size}`.toUpperCase(),
        color,
        size,
        stock: 5 + ((ci * 4 + si * 3) % 11),
      }))
    );

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: `${p.name}. Bahan nyaman dan berkualitas, cocok untuk dipakai sehari-hari. (Deskripsi contoh dari seed.)`,
        categoryId: categoryIds[p.cat],
        basePrice: p.price,
        weightGram: p.weight,
        isFeatured: p.featured,
        images: {
          create: [1, 2, 3].map((n, i) => ({
            url: `https://picsum.photos/seed/${slug}-${n}/800/1000`,
            publicId: `seed/${slug}-${n}`,
            position: i,
            isPrimary: i === 0,
          })),
        },
        variants: { create: variants },
      },
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });