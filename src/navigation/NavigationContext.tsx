/**
 * Navegación.
 *
 * Un navegador propio, mínimo, sobre primitivas de React Native: cuatro tabs
 * (Home, Explore, Wishlist, Profile) y una pila por encima para lo que se
 * empuja (ficha de producto, categoría, carrito, Muse).
 *
 * No se usa React Navigation porque arrastra `react-native-screens`, una
 * dependencia nativa, y ahora mismo el lockfile no se puede regenerar: el SDK
 * de DY vive en GitHub Packages y sin el token `npm install` falla con 401. En
 * cuanto el paquete se pueda instalar, esto es reemplazable por un stack
 * navigator de verdad sin tocar las pantallas: todas navegan por este hook.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { Product, ProductCategory } from '../models';

export type TabName = 'home' | 'explore' | 'wishlist' | 'profile';

/** Pantallas que se apilan sobre los tabs. */
export type Route =
  | { name: 'product'; product: Product }
  | { name: 'category'; category: ProductCategory }
  | { name: 'cart' }
  | { name: 'muse' };

interface NavigationContextValue {
  tab: TabName;
  stack: Route[];
  /** La pantalla visible: la cima de la pila, o el tab si está vacía. */
  current: Route | undefined;
  setTab: (tab: TabName) => void;
  push: (route: Route) => void;
  pop: () => void;
  popToRoot: () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(
  undefined,
);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tab, setTabState] = useState<TabName>('home');
  const [stack, setStack] = useState<Route[]>([]);

  const setTab = useCallback((next: TabName) => {
    // Cambiar de tab descarta la pila, como haría un TabView.
    setStack([]);
    setTabState(next);
  }, []);

  const push = useCallback((route: Route) => {
    setStack(current => [...current, route]);
  }, []);

  const pop = useCallback(() => {
    setStack(current => current.slice(0, -1));
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      tab,
      stack,
      current: stack[stack.length - 1],
      setTab,
      push,
      pop,
      popToRoot: () => setStack([]),
    }),
    [tab, stack, setTab, push, pop],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error(
      'useNavigation debe usarse dentro de <NavigationProvider>.',
    );
  }
  return context;
};
