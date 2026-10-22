const key = (orderNumber: string) => `kamai-order-email:${orderNumber}`;

export function rememberOrderEmail(orderNumber: string, email: string) {
  try {
    sessionStorage.setItem(key(orderNumber), email);
  } catch {
    /* penyimpanan tidak tersedia, abaikan */
  }
}

export function recallOrderEmail(orderNumber: string): string | null {
  try {
    return sessionStorage.getItem(key(orderNumber));
  } catch {
    return null;
  }
}

export function forgetOrderEmail(orderNumber: string) {
  try {
    sessionStorage.removeItem(key(orderNumber));
  } catch {
    /* abaikan */
  }
}