import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { TtlCache } from "../lib/ttlCache";
import { esc } from "../emails/templates";
import { getPublicStore } from "./store-settings.service";

const STATIC_PATHS = ["/", "/products", "/about", "/contact", "/faq", "/policy", "/privacy"];
const sitemapCache = new TtlCache<string>(10 * 60_000, 1);

const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

function sized(url: string, width: number): string {
  return CLOUDINARY.test(url) ? url.replace("/upload/", `/upload/w_${width},c_limit/`) : url;
}

export async function getSitemapXml(): Promise<string> {
  const hit = sitemapCache.get("xml");
  if (hit) return hit;

  const base = env.siteUrl;
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.category.findMany({
      where: { products: { some: { isActive: true, deletedAt: null } } },
      select: { slug: true },
    }),
  ]);

  const urls: { loc: string; lastmod?: string }[] = [
    ...STATIC_PATHS.map((p) => ({ loc: `${base}${p}` })),
    ...categories.map((c) => ({ loc: `${base}/products?category=${encodeURIComponent(c.slug)}` })),
    ...products.map((p) => ({
      loc: `${base}/products/${encodeURIComponent(p.slug)}`,
      lastmod: p.updatedAt.toISOString(),
    })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
      .join("\n") +
    `\n</urlset>\n`;

  sitemapCache.set("xml", xml);
  return xml;
}

/** Halaman HTML berisi tag pratinjau (Open Graph) untuk satu produk; pengunjung biasa diarahkan ke toko */
export async function getProductOgHtml(slug: string): Promise<string | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!product) return null;

  const store = await getPublicStore();
  const target = `${env.siteUrl}/products/${encodeURIComponent(product.slug)}`;
  const title = `${product.name} | ${store.name}`;
  const plain = product.description.replace(/\s+/g, " ").trim();
  const description = plain.length > 200 ? `${plain.slice(0, 197)}...` : plain;
  const image = product.images[0]?.url ? sized(product.images[0].url, 1200) : null;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(target)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="${esc(store.name)}">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(target)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n` : ""}<meta property="product:price:amount" content="${product.basePrice}">
<meta property="product:price:currency" content="IDR">
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head>
<body>
<p><a href="${esc(target)}">Buka ${esc(product.name)}</a></p>
</body>
</html>
`;
}