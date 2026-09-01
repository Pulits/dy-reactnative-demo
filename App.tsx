/**
 * Blueberry — demo de React Native + Dynamic Yield.
 *
 * Los providers van en este orden a propósito: `DyProvider` crea el servicio y
 * lo inicializa, y carrito y wishlist reportan eventos a través de él, así que
 * cuelgan por debajo.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DyProvider } from './src/dy/DyProvider';
import { AppShell } from './src/navigation/AppShell';
import { NavigationProvider } from './src/navigation/NavigationContext';
import { CartProvider } from './src/state/CartContext';
import { WishlistProvider } from './src/state/WishlistContext';

const App = (): React.JSX.Element => (
  <SafeAreaProvider>
    <StatusBar barStyle="dark-content" />
    <DyProvider>
      <CartProvider>
        <WishlistProvider>
          <NavigationProvider>
            <AppShell />
          </NavigationProvider>
        </WishlistProvider>
      </CartProvider>
    </DyProvider>
  </SafeAreaProvider>
);

export default App;
