/**
 * Armazón de la app — port de `RootView.swift` y `ContentView.swift`.
 *
 * Splash → login de identidad (una sola vez) → cuatro tabs, con una pila por
 * encima para ficha de producto, categoría, carrito y Muse.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePopOnChange } from '../components/motion';
import { Animated } from 'react-native';
import { CartScreen } from '../screens/CartScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { IdentitySetupScreen } from '../screens/IdentitySetupScreen';
import { MuseScreen } from '../screens/MuseScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { useCart } from '../state/CartContext';
import { theme } from '../theme';
import type { Route, TabName } from './NavigationContext';
import { useNavigation } from './NavigationContext';

const TABS: { name: TabName; label: string; icon: string }[] = [
  { name: 'home', label: 'Home', icon: '⌂' },
  { name: 'explore', label: 'Explore', icon: '⌕' },
  { name: 'wishlist', label: 'Wishlist', icon: '♡' },
  { name: 'profile', label: 'Profile', icon: '☺' },
];

const titleOf = (route: Route): string => {
  switch (route.name) {
    case 'product':
      return route.product.name;
    case 'category':
      return route.category;
    case 'cart':
      return 'Cart';
    case 'muse':
      return 'Shopping Muse';
  }
};

const renderRoute = (route: Route): React.ReactElement => {
  switch (route.name) {
    case 'product':
      return <ProductDetailScreen product={route.product} />;
    case 'category':
      return <CategoryScreen category={route.category} />;
    case 'cart':
      return <CartScreen />;
    case 'muse':
      return <MuseScreen />;
  }
};

const renderTab = (tab: TabName): React.ReactElement => {
  switch (tab) {
    case 'home':
      return <HomeScreen />;
    case 'explore':
      return <ExploreScreen />;
    case 'wishlist':
      return <WishlistScreen />;
    case 'profile':
      return <ProfileScreen />;
  }
};

const CartButton: React.FC = () => {
  const cart = useCart();
  const { push } = useNavigation();
  const scale = usePopOnChange(cart.itemCount);

  return (
    <Pressable
      onPress={() => push({ name: 'cart' })}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Carrito, ${cart.itemCount} artículo(s)`}
    >
      <Text style={styles.headerIcon}>⛬</Text>
      {cart.itemCount > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
          <Text style={styles.badgeText}>{cart.itemCount}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
};

export const AppShell: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const { tab, setTab, current, stack, pop } = useNavigation();

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!onboarded) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <IdentitySetupScreen onDone={() => setOnboarded(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {stack.length > 0 ? (
          <Pressable
            onPress={pop}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.headerIcon}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={styles.headerTitle} numberOfLines={1}>
          {current ? titleOf(current) : 'Blueberry'}
        </Text>

        <CartButton />
      </View>

      <View style={styles.body}>
        {current ? renderRoute(current) : renderTab(tab)}
      </View>

      {stack.length === 0 && (
        <View style={styles.tabBar}>
          {TABS.map(entry => (
            <Pressable
              key={entry.name}
              onPress={() => setTab(entry.name)}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === entry.name }}
            >
              <Text
                style={[styles.tabIcon, tab === entry.name && styles.tabActive]}
              >
                {entry.icon}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  tab === entry.name && styles.tabActive,
                ]}
              >
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
  },
  headerSpacer: { width: 22 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.font.section,
    fontWeight: '700',
    color: theme.color.text,
  },
  headerIcon: { fontSize: 22, color: theme.color.text },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 19, color: theme.color.textFaint },
  tabLabel: { fontSize: theme.font.caption, color: theme.color.textFaint },
  tabActive: { color: theme.color.brand, fontWeight: '700' },
});
