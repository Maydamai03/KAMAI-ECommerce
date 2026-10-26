import "dotenv/config";
import { openAsBlob } from "node:fs";
import path from "node:path";

const [productId, ...files] = process.argv.slice(2);

if (!productId || files.length === 0) {
  console.error("Pemakaian: node scripts/image-test.mjs <productId> <berkas1> [berkas2 ...]");
  process.exit(1);
}

const BASE = "http://localhost:5000/api";

const login = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL ?? "admin@tokobaju.test",
    password: process.env.ADMIN_PASSWORD ?? "Admin12345!",
  }),
});
if (!login.ok) {
  console.error("Login admin gagal:", login.status);
  process.exit(1);
}
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");

const form = new FormData();
for (const file of files) {
  form.append("images", await openAsBlob(file), path.basename(file));
}

const res = await fetch(`${BASE}/admin/products/${productId}/images`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: form,
});

console.log("Status:", res.status);
console.log(JSON.stringify(await res.json(), null, 2));