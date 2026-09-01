/**
 * Wishlist — port de `WishlistManager.swift`.
 *
 * Solo el alta reporta a DY: quitar de la wishlist no tiene evento estándar en
 * el SDK, igual que en iOS.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useDy } from '../dy/DyProvider';
import type { Product } from '../models';

interface WishlistContextValue {
  items: Product[];
  contains: (product: Product) => boolean;
  toggle: (product: Product) => void;
  remove: (product: Product) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined,
);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dy = useDy();
  const [items, setItems] = useState<Product[]>([]);

  const contains = useCallback(
    (product: Product) => items.some(item => item.id === product.id),
    [items],
  );

  const remove = useCallback((product: Product) => {
    setItems(current => current.filter(item => item.id !== product.id));
  }, []);

  const toggle = useCallback(
    (product: Product) => {
      setItems(current => {
        if (current.some(item => item.id === product.id)) {
          return current.filter(item => item.id !== product.id);
        }
        void dy.reportAddToWishlist(product);
        return [product, ...current];
      });
    },
    [dy],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({ items, contains, toggle, remove, clear: () => setItems([]) }),
    [items, contains, toggle, remove],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist debe usarse dentro de <WishlistProvider>.');
  }
  return context;
};
