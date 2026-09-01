/**
 * Carrito — port de `CartManager.swift`.
 *
 * Cada cambio reporta dos cosas a DY: el evento concreto (add/remove) y un
 * `Sync Cart` con el estado resultante. El sync es lo que mantiene el carrito
 * de DY al día entre sesiones y dispositivos; sin él, DY solo vería los deltas
 * y se desincronizaría en cuanto se pierda un evento.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useDy } from '../dy/DyProvider';
import type { CartItem, Product } from '../models';
import { skuOf } from '../models';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  skus: string[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (product: Product) => void;
  updateQuantity: (product: Product, quantity: number) => void;
  checkout: () => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dy = useDy();
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (product: Product, quantity = 1) => {
      setItems(current => {
        const index = current.findIndex(item => item.product.id === product.id);
        const next =
          index >= 0
            ? current.map((item, i) =>
                i === index
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              )
            : [...current, { id: product.id, product, quantity }];

        void dy
          .reportAddToCart(product, quantity)
          .then(() => dy.reportSyncCart(next));
        return next;
      });
    },
    [dy],
  );

  const removeItem = useCallback(
    (product: Product) => {
      setItems(current => {
        const removed =
          current.find(item => item.product.id === product.id)?.quantity ?? 0;
        if (removed === 0) {
          return current;
        }
        const next = current.filter(item => item.product.id !== product.id);
        void dy
          .reportRemoveFromCart(product, removed)
          .then(() => dy.reportSyncCart(next));
        return next;
      });
    },
    [dy],
  );

  const updateQuantity = useCallback(
    (product: Product, quantity: number) => {
      if (quantity <= 0) {
        removeItem(product);
        return;
      }
      setItems(current => {
        const index = current.findIndex(item => item.product.id === product.id);
        if (index < 0) {
          return current;
        }
        const delta = quantity - current[index].quantity;
        if (delta === 0) {
          return current;
        }
        const next = current.map((item, i) =>
          i === index ? { ...item, quantity } : item,
        );

        const event =
          delta > 0
            ? dy.reportAddToCart(product, delta)
            : dy.reportRemoveFromCart(product, -delta);
        void event.then(() => dy.reportSyncCart(next));
        return next;
      });
    },
    [dy, removeItem],
  );

  const total = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );

  const checkout = useCallback(() => {
    if (items.length === 0) {
      return;
    }
    void dy.reportPurchase(items, total);
    setItems([]);
  }, [dy, items, total]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total,
      skus: items.map(item => skuOf(item.product)),
      addItem,
      removeItem,
      updateQuantity,
      checkout,
      clear: () => setItems([]),
    }),
    [items, total, addItem, removeItem, updateQuantity, checkout],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de <CartProvider>.');
  }
  return context;
};
