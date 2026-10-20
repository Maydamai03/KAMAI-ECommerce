import { useEffect } from "react";
import { useCartLines } from "../hooks/useCartLines";
import { useCartStore } from "../store/cart";

export default function CartSync() {
  const { lines, isSettled } = useCartLines();
  const remove = useCartStore((s) => s.remove);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setNotice = useCartStore((s) => s.setNotice);

  useEffect(() => {
    if (!isSettled) return;

    let removed = false;
    let reduced = false;

    for (const line of lines) {
      if (line.issue === "UNAVAILABLE") {
        remove(line.variantId);
        removed = true;
      } else if (line.issue === "INSUFFICIENT_STOCK" && line.data?.available) {
        setQuantity(line.variantId, line.data.stock);
        reduced = true;
      }
    }

    if (removed || reduced) {
      const parts: string[] = [];
      if (removed) parts.push("Beberapa produk sudah tidak tersedia dan dihapus dari keranjang.");
      if (reduced) parts.push("Jumlah beberapa produk disesuaikan dengan stok terbaru.");
      setNotice(parts.join(" "));
    }
  }, [isSettled, lines, remove, setQuantity, setNotice]);

  return null;
}