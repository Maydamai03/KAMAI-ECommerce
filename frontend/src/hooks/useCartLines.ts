import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { validateCart } from "../services/cart";
import { useCartStore } from "../store/cart";
import type { CartLineData } from "../types";

export type LineIssue = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | null;

export interface CartLineView {
  variantId: string;
  quantity: number;
  data: CartLineData | null; // null = masih dimuat
  issue: LineIssue;
  lineTotal: number;
}

export function useCartLines() {
  const items = useCartStore((s) => s.items);
  const key = items.map((i) => `${i.variantId}:${i.quantity}`).join(",");

  const query = useQuery({
    queryKey: ["cart-validate", key],
    queryFn: () => validateCart(items),
    enabled: items.length > 0,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const lines = useMemo<CartLineView[]>(() => {
    const serverLines = items.length > 0 ? (query.data?.lines ?? []) : [];

    return items.map((item) => {
      const data = serverLines.find((l) => l.variantId === item.variantId) ?? null;

      let issue: LineIssue = null;
      if (data) {
        if (!data.available) issue = "UNAVAILABLE";
        else if (data.stock === 0) issue = "OUT_OF_STOCK";
        else if (item.quantity > data.stock) issue = "INSUFFICIENT_STOCK";
      }

      const lineTotal =
        data && data.available && !issue ? data.unitPrice * item.quantity : 0;

      return { variantId: item.variantId, quantity: item.quantity, data, issue, lineTotal };
    });
  }, [items, query.data]);

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const isSettled = query.isSuccess && !query.isPlaceholderData && !query.isFetching;
  const canCheckout =
    lines.length > 0 &&
    !query.isPlaceholderData &&
    lines.every((l) => l.data !== null && l.issue === null);

  return {
    lines,
    subtotal,
    totalQuantity,
    canCheckout,
    isSettled,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}