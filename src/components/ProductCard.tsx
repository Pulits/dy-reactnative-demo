/**
 * Tarjeta de producto.
 *
 * El click se reporta a DY antes de navegar: sin `slotId` no habría SLOT_CLICK
 * y la campaña no se llevaría la atribución.
 */

import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
} from 'react-native';

import { useDy } from '../dy/DyProvider';
import type { Product } from '../models';
import { useNavigation } from '../navigation/NavigationContext';
import { useWishlist } from '../state/WishlistContext';
import { formatPrice, theme } from '../theme';

export const StarRating: React.FC<{ rating: number; reviews?: number }> = ({
  rating,
  reviews,
}) => (
  <View style={styles.ratingRow}>
    <Text style={styles.star}>★</Text>
    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    {reviews !== undefined && (
      <Text style={styles.reviewCount}>({reviews})</Text>
    )}
  </View>
);

export const ProductImage: React.FC<{
  uri?: string;
  style?: ImageStyle;
}> = ({ uri, style }) =>
  uri ? (
    <Image source={{ uri }} style={[styles.image, style]} resizeMode="cover" />
  ) : (
    <View style={[styles.image, styles.imageFallback, style]}>
      <Text style={styles.imageFallbackMark}>B</Text>
    </View>
  );

export const ProductCard: React.FC<{
  product: Product;
  width: number;
  showWishlist?: boolean;
}> = ({ product, width, showWishlist = true }) => {
  const dy = useDy();
  const { push } = useNavigation();
  const wishlist = useWishlist();
  const saved = wishlist.contains(product);

  const open = (): void => {
    void dy.reportRecommendationClick(product);
    push({ name: 'product', product });
  };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatPrice(product.price)}`}
    >
      <View>
        <ProductImage
          uri={product.imageUrl}
          style={{ width, height: width * 1.25 }}
        />

        {showWishlist && (
          <Pressable
            onPress={() => wishlist.toggle(product)}
            hitSlop={8}
            style={styles.wishButton}
            accessibilityRole="button"
            accessibilityLabel={
              saved ? 'Quitar de la wishlist' : 'Añadir a la wishlist'
            }
          >
            <Text style={[styles.wishIcon, saved && styles.wishIconOn]}>
              {saved ? '♥' : '♡'}
            </Text>
          </Pressable>
        )}

        {!product.inStock && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>Out of stock</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        {product.rating !== undefined && (
          <StarRating rating={product.rating} reviews={product.reviewCount} />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.md, overflow: 'hidden' },
  cardPressed: { opacity: 0.7 },
  image: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceAlt,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackMark: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.color.borderStrong,
  },
  wishButton: {
    position: 'absolute',
    top: theme.space.sm,
    right: theme.space.sm,
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishIcon: { fontSize: 17, color: theme.color.textMuted },
  wishIconOn: { color: theme.color.brand },
  stockBadge: {
    position: 'absolute',
    bottom: theme.space.sm,
    left: theme.space.sm,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(18,18,26,0.78)',
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: theme.font.caption,
    fontWeight: '600',
  },
  body: { paddingTop: theme.space.sm, gap: 2 },
  name: {
    fontSize: theme.font.body,
    color: theme.color.text,
    lineHeight: 20,
  },
  price: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.color.text,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: theme.color.star, fontSize: theme.font.label },
  ratingText: { fontSize: theme.font.label, color: theme.color.textMuted },
  reviewCount: { fontSize: theme.font.caption, color: theme.color.textFaint },
});
