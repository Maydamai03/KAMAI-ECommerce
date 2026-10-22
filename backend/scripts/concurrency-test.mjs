const [variantId, count = "5"] = process.argv.slice(2);

if (!variantId) {
  console.error("Pemakaian: node scripts/concurrency-test.mjs <variantId> [jumlah]");
  process.exit(1);
}

const body = JSON.stringify({
  items: [{ variantId, quantity: 1 }],
  email: "race@contoh.com",
  address: {
    recipientName: "Uji Rebutan",
    phone: "081234567890",
    province: "Jawa Timur",
    city: "Surabaya",
    district: "Gubeng",
    postalCode: "60281",
    street: "Jl. Uji Rebutan No. 1",
  },
});

const statuses = await Promise.all(
  Array.from({ length: Number(count) }, () =>
    fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).then((r) => r.status)
  )
);

console.log("Status tiap permintaan:", statuses);
console.log("Berhasil:", statuses.filter((s) => s === 201).length);
console.log("Ditolak karena stok:", statuses.filter((s) => s === 409).length);

