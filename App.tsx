import React, { useCallback, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
// El SafeAreaView de react-native quedó deprecado en 0.81.
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { DyDebugPanel } from './src/components/DyDebugPanel';
import { DyProvider } from './src/dy';
import { CartScreen } from './src/screens/CartScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProductScreen } from './src/screens/ProductScreen';
import { CartProvider, useCart } from './src/state/CartContext';
import { theme } from './src/theme';

/**
 * Navegación mínima, a propósito.
 *
 * La demo va sin react-navigation para que el foco quede en la integración con
 * Dynamic Yield y no en el árbol de navegación. Al migrar a react-navigation,
 * lo único que cambia es de dónde sale el contexto de pantalla que se pasa a
 * `usePageView` / `useChoose`.
 */
type Route =
  | { name: 'home' }
  | { name: 'product'; sku: string }
  | { name: 'cart' };

const Shell: React.FC = () => {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [debugVisible, setDebugVisible] = useState(false);
  const cart = useCart();

  const goToProduct = useCallback(
    (sku: string) => setRoute({ name: 'product', sku }),
    [],
  );
  const goHome = useCallback(() => setRoute({ name: 'home' }), []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.color.bg} />

      <View style={styles.header}>
        {route.name === 'home' ? (
          <Text style={styles.brand}>Sendero</Text>
        ) : (
          <Pressable onPress={goHome} accessibilityRole="button">
            <Text style={styles.back}>← Tienda</Text>
          </Pressable>
        )}

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setDebugVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ver actividad de Dynamic Yield">
            <Text style={styles.action}>DY</Text>
          </Pressable>
          <Pressable
            onPress={() => setRoute({ name: 'cart' })}
            accessibilityRole="button"
            accessibilityLabel={`Carrito, ${cart.count} artículos`}>
            <Text style={styles.action}>Carrito ({cart.count})</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {route.name === 'home' && <HomeScreen onSelectProduct={goToProduct} />}
        {route.name === 'product' && (
          <ProductScreen sku={route.sku} onSelectProduct={goToProduct} />
        )}
        {route.name === 'cart' && <CartScreen onContinue={goHome} />}
      </View>

      <DyDebugPanel
        visible={debugVisible}
        onClose={() => setDebugVisible(false)}
      />
    </SafeAreaView>
  );
};

const App: React.FC = () => (
  <SafeAreaProvider>
    <DyProvider>
      <CartProvider>
        <Shell />
      </CartProvider>
    </DyProvider>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space(2),
    paddingVertical: theme.space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  brand: { color: theme.color.text, fontSize: 20, fontWeight: '800' },
  back: { color: theme.color.accent, fontSize: 15, fontWeight: '600' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(2),
  },
  action: { color: theme.color.textMuted, fontSize: 13, fontWeight: '600' },
  body: { flex: 1 },
});

export default App;
