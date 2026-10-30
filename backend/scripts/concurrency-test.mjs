const [variantId, count = "5"] = process.argv.slice(2);
const BASE = process.env.API_URL ?? "http://localhost:5000/api";

if (!variantId) {
  console.error("Pemakaian: node scripts/concurrency-test.mjs <variantId> [jumlah]");
  process.exit(1);
}

const json = { "Content-Type": "application/json" };

const areas = await (await fetch(`${BASE}/shipping/areas?q=gubeng`)).json();
const area = areas.data?.[0];
const postalCode = "60281";

const ratesRes = await (
  await fetch(`${BASE}/shipping/rates`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ items: [{ variantId, quantity: 1 }], areaId: area?.id, postalCode }),
  })
).json();

const rate = ratesRes.data?.rates?.[0];
if (!rate) {
  console.error("Tidak ada tarif. Pastikan stok varian minimal 1:", JSON.stringify(ratesRes));
  process.exit(1);
}

const body = JSON.stringify({
  items: [{ variantId, quantity: 1 }],
  email: "race@contoh.com",
  address: {
    recipientName: "Uji Rebutan",
    phone: "081234567890",
    province: area?.province ?? "Jawa Timur",
    city: area?.city ?? "Kota Surabaya",
    district: area?.district ?? "Gubeng",
    postalCode,
    street: "Jl. Uji Rebutan No. 1",
    areaId: area?.id,
  },
  shipping: { courierCode: rate.courierCode, serviceCode: rate.serviceCode, expectedCost: rate.price },
});

const statuses = await Promise.all(
  Array.from({ length: Number(count) }, () =>
    fetch(`${BASE}/orders`, { method: "POST", headers: json, body }).then((r) => r.status)
  )
);

console.log("Status tiap permintaan:", statuses);
console.log("Berhasil:", statuses.filter((s) => s === 201).length);
console.log("Ditolak karena stok:", statuses.filter((s) => s === 409).length);