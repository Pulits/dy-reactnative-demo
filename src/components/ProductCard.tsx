import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatPrice, type DisplayProduct } from '../catalog';
import { theme, tintFor } from '../theme';
import { Skeleton } from './motion';

interface Props {
  product: DisplayProduct;
  onPress: () => void;
  variant?: 'rail' | 'grid' | 'row';
  /** Marca la tarjeta como servida por una campaña de DY. */
  badge?: string;
}

const SIZES = {
  rail: { width: 176, image: 176 },
  grid: { width: '48%' as const, image: 150 },
  row: { width: '100%' as const, image: 72 },
};

export const ProductCard: React.FC<Props> = ({
  product,
  onPress,
  variant = 'rail',
  badge,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const [imageFailed, setImageFailed] = useState(false);
  const size = SIZES[variant];
  const isRow = variant === 'row';

  const press = (toValue: number): void => {
    Animated.spring(scale, {
      toValue,
      friction: 7,
      tension: 220,
      useNativeDriver: true,
    }).start();
  };

  // Sin imagen del feed se usa un tinte estable derivado del SKU, para que la
  // tarjeta nunca quede vacía ni cambie de color entre renders.
  const showImage = Boolean(product.imageUrl) && !imageFailed;

  return (
    <Animated.View style={{ width: size.width, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        accessibilityRole="button"
        accessibilityLabel={
          product.price === undefined
            ? product.name
            : `${product.name}, ${formatPrice(product.price, product.currency)}`
        }
        style={[styles.card, isRow && styles.cardRow]}>
        <View
          style={[
            styles.imageWrap,
            { height: size.image },
            isRow && styles.imageWrapRow,
            { backgroundColor: tintFor(product.sku) },
          ]}>
          {showImage && (
            <Image
              source={{ uri: product.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          )}

          {!product.inStock && (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>AGOTADO</Text>
            </View>
          )}

          {badge && !isRow && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}

          {!isRow && <View style={styles.veil} pointerEvents="none" />}
        </View>

        <View style={[styles.body, isRow && styles.bodyRow]}>
          {product.brand && (
            <Text style={styles.brand} numberOfLines={1}>
              {product.brand.toUpperCase()}
            </Text>
          )}
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {product.price === undefined ? (
            <Skeleton width={64} height={14} />
          ) : (
            <Text style={styles.price}>
              {formatPrice(product.price, product.currency)}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

/** Hueco de una tarjeta mientras la campaña de DY resuelve. */
export const ProductCardSkeleton: React.FC<{ variant?: 'rail' | 'grid' }> = ({
  variant = 'rail',
}) => {
  const size = SIZES[variant];
  return (
    <View style={{ width: size.width }}>
      <Skeleton width="100%" height={size.image} radius={theme.radius.md} />
      <View style={styles.body}>
        <Skeleton width={52} height={8} />
        <Skeleton width="90%" height={13} />
        <Skeleton width={68} height={13} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  imageWrap: { width: '100%', overflow: 'hidden' },
  imageWrapRow: { width: 72, height: 72 },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.veilBottom,
    opacity: 0.35,
  },
  badge: {
    position: 'absolute',
    top: theme.space(1),
    left: theme.space(1),
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(1),
    paddingVertical: 3,
  },
  badgeText: { ...theme.font.micro, color: '#fff' },
  soldOut: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: { ...theme.font.micro, color: theme.color.textMuted },
  body: { padding: theme.space(1.5), gap: 3 },
  bodyRow: { flex: 1, paddingVertical: theme.space(1) },
  brand: { ...theme.font.micro, color: theme.color.textFaint },
  name: { ...theme.font.body, color: theme.color.text, lineHeight: 19 },
  price: { ...theme.font.heading, color: theme.color.accentSoft },
});
