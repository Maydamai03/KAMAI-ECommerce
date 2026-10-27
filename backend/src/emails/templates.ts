import { mailConfig } from "../config/mail";

export interface EmailOrder {
  orderNumber: string;
  email: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  expiresAt: Date;
  address: {
    recipientName: string;
    phone: string;
    street: string;
    district: string;
    city: string;
    province: string;
    postalCode: string;
    note?: string | null;
  };
  items: { productName: string; variantLabel: string; unitPrice: number; quantity: number }[];
  courier?: string | null;
}

export interface StoreInfo {
  name: string;
  email?: string;
  phone?: string;
}

/** Semua teks dari pengguna wajib lewat sini sebelum masuk ke HTML */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const dateTime = (d: Date) =>
  `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d)} WIB`;

interface Content {
  subject: string;
  heading: string;
  intro: string;
  notice: string;
  buttonLabel: string;
}

function render(order: EmailOrder, c: Content, store: StoreInfo) {
  const brand = store.name;
  const frontendUrl = mailConfig.frontendUrl;
  const contact = [store.email, store.phone].filter((v): v is string => Boolean(v));

  const link = `${frontendUrl}/orders/${order.orderNumber}`;
  const a = order.address;

  const itemRows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;">
          ${esc(i.productName)}<br>
          <span style="color:#737373;font-size:12px;">${esc(i.variantLabel)} &times; ${i.quantity}</span>
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;white-space:nowrap;">
          ${esc(rupiah(i.unitPrice * i.quantity))}
        </td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="id">
<body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#171717;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
        <tr><td style="background:#171717;color:#ffffff;padding:20px 24px;font-size:20px;font-weight:bold;">${esc(brand)}</td></tr>
        <tr><td style="padding:24px;">
          <h1 style="font-size:20px;margin:0 0 8px;">${esc(c.heading)}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">${esc(c.intro)}</p>
          <p style="margin:0 0 16px;padding:12px;background:#fff7ed;font-size:14px;line-height:1.5;">${esc(c.notice)}</p>
          <p style="margin:0 0 8px;font-size:14px;">Nomor pesanan: <strong>${esc(order.orderNumber)}</strong></p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            ${itemRows}
            <tr><td style="padding-top:12px;font-size:14px;">Subtotal</td><td align="right" style="padding-top:12px;font-size:14px;">${esc(rupiah(order.subtotal))}</td></tr>
            <tr><td style="padding-top:4px;font-size:14px;">Ongkos kirim</td><td align="right" style="padding-top:4px;font-size:14px;">${esc(rupiah(order.shippingCost))}</td></tr>
            <tr><td style="padding-top:8px;font-size:16px;font-weight:bold;">Total</td><td align="right" style="padding-top:8px;font-size:16px;font-weight:bold;">${esc(rupiah(order.total))}</td></tr>
          </table>

          <h2 style="font-size:14px;margin:24px 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Dikirim ke</h2>
          <p style="margin:0;font-size:14px;line-height:1.5;">
            ${esc(a.recipientName)} &middot; ${esc(a.phone)}<br>
            ${esc(a.street)}<br>
            ${esc(a.district)}, ${esc(a.city)}, ${esc(a.province)} ${esc(a.postalCode)}
            ${order.courier ? `<br><span style="color:#737373;">Kurir: ${esc(order.courier)}</span>` : ""}
            ${a.note ? `<br><span style="color:#737373;">Catatan: ${esc(a.note)}</span>` : ""}
          </p>

          <p style="margin:24px 0;">
            <a href="${esc(link)}" style="display:inline-block;background:#171717;color:#ffffff;padding:12px 24px;font-size:14px;font-weight:bold;text-decoration:none;">${esc(c.buttonLabel)}</a>
          </p>
          <p style="margin:0;font-size:12px;color:#737373;line-height:1.5;">
            Kalau kamu memesan tanpa akun, masukkan email ini (${esc(order.email)}) saat diminta untuk membuka pesanan.
          </p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;font-size:12px;color:#737373;">
          Email ini dikirim otomatis oleh ${esc(brand)}.${
            contact.length ? `<br>Pertanyaan? Hubungi kami: ${contact.map(esc).join(" &middot; ")}` : ""
          }        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    c.heading,
    "",
    c.intro,
    c.notice,
    "",
    `Nomor pesanan: ${order.orderNumber}`,
    ...order.items.map(
      (i) => `- ${i.productName} (${i.variantLabel}) x ${i.quantity}: ${rupiah(i.unitPrice * i.quantity)}`
    ),
    `Subtotal: ${rupiah(order.subtotal)}`,
    `Ongkos kirim: ${rupiah(order.shippingCost)}`,
    `Total: ${rupiah(order.total)}`,
    "",
    `Dikirim ke: ${a.recipientName}, ${a.phone}`,
    `${a.street}, ${a.district}, ${a.city}, ${a.province} ${a.postalCode}`,
    ...(order.courier ? [`Kurir: ${order.courier}`] : []),
    "",
    `${c.buttonLabel}: ${link}`,
    ...(contact.length ? ["", `Pertanyaan? Hubungi kami: ${contact.join(" / ")}`] : []),    
  ].join("\n");

  return { subject: c.subject, html, text };
}

export function orderCreatedEmail(order: EmailOrder, store: StoreInfo) {
  return render(
    order,
    {
      subject: `[${store.name}] Pesanan ${order.orderNumber} dibuat`,
      heading: "Terima kasih, pesananmu sudah dibuat",
      intro: `Halo ${order.address.recipientName}, kami sudah menerima pesananmu dan menahan stoknya.`,
      notice: `Selesaikan pembayaran sebelum ${dateTime(order.expiresAt)}. Pesanan yang tidak dibayar sampai batas waktu akan dibatalkan otomatis.`,
      buttonLabel: "Bayar / lihat pesanan",
    },
    store
  );
}

export function paymentReceivedEmail(order: EmailOrder, store: StoreInfo) {
  return render(
    order,
    {
      subject: `[${store.name}] Pembayaran pesanan ${order.orderNumber} diterima`,
      heading: "Pembayaran diterima",
      intro: `Halo ${order.address.recipientName}, pembayaranmu sudah kami terima. Terima kasih!`,
      notice: "Pesananmu akan segera kami proses. Kami akan mengabari lagi saat pesanan dikirim.",
      buttonLabel: "Lihat pesanan",
    },
    store
  );
}

export function orderShippedEmail(order: EmailOrder, trackingNumber: string, store: StoreInfo) {
  return render(
    order,
    {
      subject: `[${store.name}] Pesanan ${order.orderNumber} sudah dikirim`,
      heading: "Pesananmu sudah dikirim",
      intro: `Halo ${order.address.recipientName}, pesananmu sudah diserahkan ke kurir.`,
      notice: `${order.courier ? `Kurir: ${order.courier}. ` : ""}Nomor resi: ${trackingNumber}. Kamu dapat melacak paket di situs atau aplikasi kurir.`,
      buttonLabel: "Lihat pesanan",
    },
    store
  );
}