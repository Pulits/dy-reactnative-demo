/**
 * Wishlist — port de `WishlistView` (dentro de `ContentView.swift`).
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductCard } from '../components/ProductCard';
import { useWishlist } from '../state/WishlistContext';
import { theme } from '../theme';

export const WishlistScreen: React.FC = () => {
  const wishlist = useWishlist();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Wishlist</Text>

      {wishlist.items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyBody}>
            Tap the heart on a product to keep it here.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {wishlist.items.map(product => (
            <ProductCard key={product.id} product={product} width={160} />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xxl,
    gap: theme.space.lg,
  },
  title: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.color.text,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  empty: { paddingTop: theme.space.xxl, gap: theme.space.sm },
  emptyTitle: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.color.text,
  },
  emptyBody: { fontSize: theme.font.body, color: theme.color.textMuted },
});
