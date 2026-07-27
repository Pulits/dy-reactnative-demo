import React, { useCallback, useState } from 'react';
import {
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// El SafeAreaView de react-native quedó deprecado en 0.81.
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { DyDebugPanel } from './src/components/DyDebugPanel';
import { usePopOnChange } from './src/components/motion';
import { DyProvider, useDy } from './src/dy';
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
  const { log, ready } = useDy();

  const badgeScale = usePopOnChange(cart.count);

  const goToProduct = useCallback(
    (sku: string) => setRoute({ name: 'product', sku }),
    [],
  );
  const goHome = useCallback(() => setRoute({ name: 'home' }), []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.color.bg} />

      <View style={styles.header}>
        {route.name === 'home' ? (
          <View style={styles.brandWrap}>
            <View style={styles.brandMark} />
            <Text style={styles.brand}>Sendero</Text>
          </View>
        ) : (
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            hitSlop={12}
            style={styles.backWrap}>
            <Text style={styles.back}>←</Text>
            <Text style={styles.backLabel}>Tienda</Text>
          </Pressable>
        )}

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setDebugVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ver actividad de Dynamic Yield"
            hitSlop={10}
            style={styles.dyPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: ready ? theme.color.success : theme.color.warning },
              ]}
            />
            <Text style={styles.dyPillText}>DY</Text>
            {log.length > 0 && (
              <Text style={styles.dyCount}>{log.length}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setRoute({ name: 'cart' })}
            accessibilityRole="button"
            accessibilityLabel={`Carrito, ${cart.count} artículos`}
            hitSlop={10}
            style={styles.cartWrap}>
            <Text style={styles.cartIcon}>🛒</Text>
            {cart.count > 0 && (
              <Animated.View
                style={[styles.cartBadge, { transform: [{ scale: badgeScale }] }]}>
                <Text style={styles.cartBadgeText}>{cart.count}</Text>
              </Animated.View>
            )}
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
    paddingHorizontal: theme.space(2.5),
    paddingVertical: theme.space(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.color.borderSoft,
    backgroundColor: theme.color.bgElevated,
  },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.space(1) },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: theme.color.accent,
    ...theme.shadow.glow,
  },
  brand: { ...theme.font.title, color: theme.color.text },
  backWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.space(1) },
  back: { color: theme.color.accentSoft, fontSize: 22, fontWeight: '700' },
  backLabel: { ...theme.font.body, color: theme.color.text },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(2),
  },
  dyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(0.75),
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(1.25),
    paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dyPillText: { ...theme.font.micro, color: theme.color.textMuted },
  dyCount: { ...theme.font.micro, color: theme.color.textFaint },
  cartWrap: { padding: 2 },
  cartIcon: { fontSize: 20 },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  body: { flex: 1 },
});

export default App;
