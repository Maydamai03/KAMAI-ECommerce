import "dotenv/config";
import { sendMail } from "../src/lib/mailer";

const to = process.argv[2] ?? "tes@contoh.com";

const ok = await sendMail({
  to,
  subject: "Tes email Kamai",
  html: "<p>Halo! Ini email uji dari backend Kamai.</p>",
  text: "Halo! Ini email uji dari backend Kamai.",
});

console.log(ok ? "Terkirim. Cek inbox Mailtrap." : "Gagal. Lihat pesan error di atas.");