import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrice, type Product } from '../catalog';
import { theme } from '../theme';

interface Props {
  product: Product;
  onPress: () => void;
  variant?: 'grid' | 'row';
}

export const ProductCard: React.FC<Props> = ({
  product,
  onPress,
  variant = 'grid',
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${product.name}, ${formatPrice(product.price, product.currency)}`}
    style={({ pressed }) => [
      styles.card,
      variant === 'row' && styles.cardRow,
      pressed && styles.pressed,
    ]}>
    <View
      style={[
        styles.thumb,
        variant === 'row' && styles.thumbRow,
        { backgroundColor: product.color },
      ]}
    />
    <View style={styles.body}>
      <Text style={styles.category}>{product.category.toUpperCase()}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.price}>
        {formatPrice(product.price, product.currency)}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    width: 168,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
  },
  cardRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
  thumb: { height: 108, width: '100%' },
  thumbRow: { height: 64, width: 64 },
  body: { padding: theme.space(1.5), flexShrink: 1, gap: 2 },
  category: {
    color: theme.color.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  name: { color: theme.color.text, fontSize: 14, fontWeight: '600' },
  price: { color: theme.color.accent, fontSize: 14, fontWeight: '700' },
});
