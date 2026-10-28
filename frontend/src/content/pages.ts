// =====================================================================
// ISI HALAMAN STATIS
// Semua teks di berkas ini adalah CONTOH. Ganti dengan informasi resmi client.
// Setelah isinya benar, ubah SAMPLE_CONTENT menjadi false.
// =====================================================================

/** Selama true, setiap halaman statis menampilkan pemberitahuan "isi masih contoh" ke pengunjung. */
export const SAMPLE_CONTENT = false;

export interface Section {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/* ------------------------------ Tentang ------------------------------ */

export const aboutIntro = (name: string) =>
  `Kenali ${name}: pakaian untuk dipakai sehari-hari, dibuat dengan perhatian pada detail.`;

export const aboutSections = (name: string): Section[] => [
  {
    heading: "Cerita kami",
    paragraphs: [
      `${name} adalah brand pakaian yang berfokus pada gaya santai yang nyaman dipakai dari pagi sampai malam. [GANTI: ceritakan awal mula brand, siapa pendirinya, dan apa yang membedakan kalian.]`,
      "[GANTI: tambahkan satu paragraf tentang proses produksi atau bahan yang digunakan.]",
    ],
  },
  {
    heading: "Yang kami pegang",
    bullets: [
      "Bahan yang nyaman dan tahan dicuci berulang kali. [GANTI: sesuaikan dengan nilai brand]",
      "Potongan yang mudah dipadukan untuk berbagai kesempatan.",
      "Informasi produk yang jujur, termasuk ukuran dan perawatan.",
      "Layanan yang ramah dan responsif.",
    ],
  },
  {
    heading: "Belanja bersama kami",
    paragraphs: [
      "Setiap pesanan dikemas dengan rapi dan dikirim lewat kurir pilihanmu. Ada pertanyaan? Hubungi kami lewat halaman Kontak, kami senang membantu.",
    ],
  },
];

/* -------------------------------- FAQ -------------------------------- */

export interface FaqItem {
  q: string;
  a: string;
}

export const faqItems = (name: string): FaqItem[] => [
  {
    q: "Bagaimana cara memesan?",
    a: "Pilih produk, tentukan warna dan ukuran, lalu tambahkan ke keranjang. Buka keranjang dan pilih Checkout, isi alamat pengiriman, pilih kurir, lalu buat pesanan. Setelah pesanan dibuat, lanjutkan ke pembayaran di halaman pesanan.",
  },
  {
    q: "Apakah saya harus membuat akun?",
    a: `Tidak wajib. Kamu bisa checkout sebagai tamu. Dengan akun ${name}, kamu bisa menyimpan alamat dan melihat riwayat pesanan.`,
  },
  {
    q: "Metode pembayaran apa yang tersedia?",
    a: "Pilihan pembayaran ditampilkan di jendela pembayaran setelah kamu menekan Bayar Sekarang, misalnya transfer virtual account, dompet digital, QRIS, atau kartu, tergantung metode yang tersedia dan batas nominal masing-masing. [GANTI: sesuaikan dengan metode yang diaktifkan]",
  },
  {
    q: "Berapa lama batas waktu pembayaran?",
    a: "Batas waktunya tertera di halaman pesananmu (umumnya 24 jam). Pesanan yang tidak dibayar sampai batas waktu dibatalkan otomatis dan stoknya dikembalikan.",
  },
  {
    q: "Bagaimana saya tahu pembayaran sudah diterima?",
    a: "Status pesanan berubah menjadi Sudah dibayar dan kami mengirim email konfirmasi ke alamat email yang kamu isi saat memesan.",
  },
  {
    q: "Berapa ongkos kirim dan lama pengirimannya?",
    a: "Ongkos kirim dan estimasi lama pengiriman dihitung di halaman checkout berdasarkan alamat tujuan, kurir yang kamu pilih, dan berat pesanan. Estimasi dapat berubah mengikuti kondisi kurir.",
  },
  {
    q: "Bagaimana cara melacak pesanan?",
    a: "Saat pesanan dikirim, kami mengirim email berisi nomor resi. Nomor resi juga tampil di halaman pesananmu. Lacak paket lewat situs atau aplikasi kurir.",
  },
  {
    q: "Saya memesan tanpa akun. Bagaimana membuka pesanan lagi?",
    a: "Buka tautan pesanan dari email, lalu masukkan email yang kamu pakai saat memesan.",
  },
  {
    q: "Bisakah saya mengubah atau membatalkan pesanan?",
    a: "Hubungi kami secepatnya lewat halaman Kontak sebelum pesanan dikirim. Pesanan yang sudah dikirim tidak dapat diubah. [GANTI: sesuaikan dengan kebijakan]",
  },
  {
    q: "Ukuran yang saya pesan tidak cocok. Apa yang harus dilakukan?",
    a: "Lihat halaman Pengiriman & retur untuk syarat penukaran, lalu hubungi kami.",
  },
];

/* ---------------------------- Pengiriman & retur ---------------------------- */

export const policyIntro =
  "Informasi pengiriman, pembatalan, penukaran, dan pengembalian dana.";

export const policySections = (name: string): Section[] => [
  {
    heading: "Pengiriman",
    paragraphs: [
      "Pesanan diproses setelah pembayaran kami terima. Lama pemrosesan umumnya 1 sampai 2 hari kerja. [GANTI: sesuaikan]",
    ],
    bullets: [
      "Kurir dan layanan yang tersedia ditampilkan di halaman checkout sesuai alamat tujuan.",
      "Ongkos kirim dihitung otomatis dan tampil sebelum kamu membuat pesanan.",
      "Nomor resi dikirim lewat email dan tampil di halaman pesanan setelah paket diserahkan ke kurir.",
      "Estimasi pengiriman adalah perkiraan dan dapat berubah karena kondisi kurir atau cuaca.",
    ],
  },
  {
    heading: "Pembatalan pesanan",
    paragraphs: [
      "Pesanan yang belum dibayar sampai batas waktu dibatalkan otomatis. Untuk pesanan yang sudah dibayar, hubungi kami sebelum pesanan dikirim. Pesanan yang sudah dikirim tidak dapat dibatalkan. [GANTI: sesuaikan]",
    ],
  },
  {
    heading: "Penukaran dan pengembalian",
    paragraphs: [
      `${name} menerima penukaran atau pengembalian dengan ketentuan berikut. [GANTI: seluruh angka dan syarat di bawah adalah contoh dan harus disetujui client]`,
    ],
    bullets: [
      "Ajukan dalam 7 hari sejak barang diterima.",
      "Barang belum dipakai atau dicuci, label masih terpasang, dan kemasan lengkap.",
      "Sertakan nomor pesanan dan foto yang menunjukkan kondisi barang.",
      "Barang yang salah kirim atau cacat produksi: ongkos kirim penukaran ditanggung toko. Penukaran karena ukuran atau selera: ongkos kirim ditanggung pembeli.",
      "Barang yang dibeli dengan potongan khusus atau ditandai tidak dapat ditukar tidak termasuk dalam kebijakan ini.",
    ],
  },
  {
    heading: "Pengembalian dana",
    paragraphs: [
      "Pengembalian dana, bila disetujui, dilakukan ke metode pembayaran yang dipakai atau ke rekening yang kamu sebutkan. Prosesnya dapat memerlukan beberapa hari kerja. [GANTI: sesuaikan lama proses]",
    ],
  },
];

/* ------------------------------ Privasi & syarat ------------------------------ */

export const privacyIntro =
  "Cara kami mengelola data pribadimu dan ketentuan dasar saat berbelanja.";

export const privacySections = (name: string): Section[] => [
  {
    heading: "Data yang kami kumpulkan",
    bullets: [
      "Data akun: nama, email, nomor HP, dan kata sandi. Kata sandi disimpan dalam bentuk acak satu arah (hash), bukan teks asli.",
      "Data pesanan: produk yang dibeli, alamat pengiriman, kurir, dan status pembayaran.",
      "Data pembayaran: kami tidak menyimpan nomor kartu atau data rahasia pembayaranmu. Pembayaran diproses oleh penyedia layanan pembayaran.",
    ],
  },
  {
    heading: "Penggunaan data",
    paragraphs: [
      "Data digunakan untuk memproses dan mengirim pesanan, menghubungimu terkait pesanan, mengirim email pemberitahuan (pesanan dibuat, pembayaran diterima, pesanan dikirim), serta menjaga keamanan layanan.",
    ],
  },
  {
    heading: "Pihak ketiga",
    paragraphs: [
      "Agar pesananmu dapat diproses, sebagian data dibagikan kepada pihak yang diperlukan:",
    ],
    bullets: [
      "Penyedia layanan pembayaran, untuk memproses pembayaran.",
      "Kurir, untuk mengantar pesanan (nama penerima, nomor HP, dan alamat).",
      "Penyedia layanan email dan hosting, untuk mengirim notifikasi dan menjalankan situs.",
    ],
  },
  {
    heading: "Cookie dan penyimpanan di perangkat",
    bullets: [
      "Cookie masuk akun: dipakai hanya untuk menjaga kamu tetap login, dan tidak dapat dibaca oleh skrip di halaman.",
      "Penyimpanan lokal di perangkat: isi keranjang disimpan di perangkatmu agar tidak hilang saat halaman dimuat ulang.",
      "Saat ini kami tidak memakai pelacak iklan. [GANTI: perbarui bagian ini bila nanti memasang analitik atau iklan]",
    ],
  },
  {
    heading: "Hak dan permintaanmu",
    paragraphs: [
      "Kamu dapat meminta salinan, perbaikan, atau penghapusan data akunmu dengan menghubungi kami lewat halaman Kontak. Beberapa data pesanan dapat tetap disimpan sepanjang diperlukan untuk pembukuan dan kewajiban hukum. [GANTI: sesuaikan setelah ditinjau client atau konsultan hukum]",
    ],
  },
  {
    heading: "Syarat berbelanja",
    bullets: [
      "Harga tertera dalam Rupiah dan dapat berubah sewaktu-waktu tanpa pemberitahuan sebelum pesanan dibuat.",
      "Pesanan dianggap berlaku setelah pembayaran kami terima.",
      "Stok terbatas. Bila terjadi kesalahan harga atau stok, kami berhak membatalkan pesanan dan mengembalikan dana yang sudah dibayarkan.",
      `Dengan berbelanja di ${name}, kamu menyetujui ketentuan ini serta kebijakan pengiriman dan retur.`,
    ],
  },
];