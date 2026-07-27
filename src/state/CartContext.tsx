import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { bySku } from '../catalog';
import type { DyCartLine } from '../dy';

export interface CartLine {
  sku: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  add: (sku: string) => void;
  remove: (sku: string) => void;
  clear: () => void;
  /** Carrito en el formato que espera el evento de compra de DY. */
  toDyCart: () => DyCartLine[];
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((sku: string) => {
    setLines(current => {
      const existing = current.find(line => line.sku === sku);
      if (existing) {
        return current.map(line =>
          line.sku === sku ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { sku, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((sku: string) => {
    setLines(current =>
      current
        .map(line =>
          line.sku === sku ? { ...line, quantity: line.quantity - 1 } : line,
        )
        .filter(line => line.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = bySku(line.sku);
        return product ? sum + product.price * line.quantity : sum;
      }, 0),
    [lines],
  );

  const count = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const toDyCart = useCallback(
    (): DyCartLine[] =>
      lines.flatMap(line => {
        const product = bySku(line.sku);
        return product
          ? [
              {
                productId: line.sku,
                quantity: line.quantity,
                itemPrice: product.price,
              },
            ]
          : [];
      }),
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({ lines, count, total, add, remove, clear, toDyCart }),
    [lines, count, total, add, remove, clear, toDyCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart debe usarse dentro de <CartProvider>.');
  }
  return value;
};
