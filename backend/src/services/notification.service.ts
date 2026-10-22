import { prisma } from "../lib/prisma";
import { sendMail } from "../lib/mailer";
import {
  orderCreatedEmail,
  paymentReceivedEmail,
  type EmailOrder,
} from "../emails/templates";


async function loadEmailOrder(orderNumber: string): Promise<EmailOrder | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: { orderBy: { productName: "asc" } } },
  });
  if (!order || !order.guestEmail) return null;

  return {
    orderNumber: order.orderNumber,
    email: order.guestEmail,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    expiresAt: order.expiresAt,
    courier: [order.courierCompany, order.courierService].filter(Boolean).join(" ") || null,
    address: order.shippingAddress as unknown as EmailOrder["address"],
    items: order.items.map((i) => ({
      productName: i.productName,
      variantLabel: i.variantLabel,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    })),
  };
}

// Kedua fungsi ini tidak pernah melempar error: kegagalan email tidak boleh memengaruhi pesanan.

export async function notifyOrderCreated(orderNumber: string): Promise<void> {
  try {
    const order = await loadEmailOrder(orderNumber);
    if (!order) return;
    const { subject, html, text } = orderCreatedEmail(order);
    await sendMail({ to: order.email, subject, html, text });
  } catch (e) {
    console.error(`[mail] gagal menyiapkan email pesanan dibuat (${orderNumber}):`, e);
  }
}

export async function notifyPaymentReceived(orderNumber: string): Promise<void> {
  try {
    const order = await loadEmailOrder(orderNumber);
    if (!order) return;
    const { subject, html, text } = paymentReceivedEmail(order);
    await sendMail({ to: order.email, subject, html, text });
  } catch (e) {
    console.error(`[mail] gagal menyiapkan email pembayaran (${orderNumber}):`, e);
  }
}