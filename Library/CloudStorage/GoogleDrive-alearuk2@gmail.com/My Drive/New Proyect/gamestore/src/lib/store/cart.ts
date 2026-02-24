import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, ProductVariant } from "@/lib/types";

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.id === product.id && item.variant?.id === variant?.id
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && item.variant?.id === variant?.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return { items: [...state.items, { product, quantity, variant }] };
        });
      },
      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.product.id === productId && item.variant?.id === variantId)
          ),
        }));
      },
      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) { get().removeItem(productId, variantId); return; }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId && item.variant?.id === variantId
              ? { ...item, quantity }
              : item
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => {
        const price = Number(item.product.price) + (item.variant?.price_adjustment || 0);
        return sum + price * item.quantity;
      }, 0),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "gamestore-cart" }
  )
);
