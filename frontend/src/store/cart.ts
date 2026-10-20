import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_PER_LINE = 10;

export interface CartItem {
  variantId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  notice: string | null;
  /** Mengembalikan jumlah akhir item itu di keranjang */
  add: (variantId: string, quantity: number, maxStock?: number) => number;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  setNotice: (notice: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      notice: null,

      add: (variantId, quantity, maxStock) => {
        const cap = Math.min(MAX_PER_LINE, maxStock ?? MAX_PER_LINE);
        const existing = get().items.find((i) => i.variantId === variantId)?.quantity ?? 0;
        if (cap <= 0) return existing;

        const next = Math.min(cap, existing + quantity);
        set((state) => ({
          items: existing
            ? state.items.map((i) => (i.variantId === variantId ? { ...i, quantity: next } : i))
            : [...state.items, { variantId, quantity: next }],
        }));
        return next;
      },

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.max(1, Math.min(MAX_PER_LINE, quantity)) }
              : i
          ),
        })),

      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setNotice: (notice) => set({ notice }),
    }),
    {
      name: "kamai-cart",
      version: 1,
      // Hanya item yang disimpan di localStorage
      partialize: (state) => ({ items: state.items }),
    }
  )
);