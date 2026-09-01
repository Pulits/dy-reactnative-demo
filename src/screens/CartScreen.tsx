/**
 * Carrito — port de `CartView.swift`.
 *
 * El pageview lleva los SKUs del carrito como contexto, que es lo que necesita
 * la campaña `Cart Recs` para recomendar sobre lo que ya hay dentro.
 */

import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductImage } from '../components/ProductCard';
import { ProductRail } from '../components/ProductRail';
import { useDy } from '../dy/DyProvider';
import { useAsync } from '../hooks/useAsync';
import { EMPTY_RECOMMENDATIONS } from '../models';
import { useCart } from '../state/CartContext';
import { formatPrice, theme } from '../theme';

export const CartScreen: React.FC = () => {
  const dy = useDy();
  const cart = useCart();
  const skuKey = cart.skus.join(',');

  useEffect(() => {
    void dy.reportCartPageView(cart.skus);
    // Solo al cambiar el contenido, no en cada render del carrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dy, skuKey]);

  const recs = useAsync(
    () => dy.getCartRecommendations(cart.skus),
    EMPTY_RECOMMENDATIONS,
    [dy, skuKey],
  );

  if (cart.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyBody}>
          Add something you like and it will show up here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {cart.items.map(item => (
          <View key={item.id} style={styles.row}>
            <ProductImage
              uri={item.product.imageUrl}
              style={styles.thumbnail}
            />

            <View style={styles.rowBody}>
              <Text style={styles.rowName} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.rowPrice}>
                {formatPrice(item.product.price)}
              </Text>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() =>
                    cart.updateQuantity(item.product, item.quantity - 1)
                  }
                  hitSlop={8}
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar una unidad"
                >
                  <Text style={styles.stepperIcon}>−</Text>
                </Pressable>

                <Text style={styles.quantity}>{item.quantity}</Text>

                <Pressable
                  onPress={() =>
                    cart.updateQuantity(item.product, item.quantity + 1)
                  }
                  hitSlop={8}
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir una unidad"
                >
                  <Text style={styles.stepperIcon}>+</Text>
                </Pressable>

                <Pressable
                  onPress={() => cart.removeItem(item.product)}
                  hitSlop={8}
                  style={styles.remove}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <ProductRail
          title={recs.data.title ?? 'Complete your order'}
          products={recs.data.products}
          loading={recs.loading}
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
        </View>
        <Pressable
          onPress={cart.checkout}
          style={({ pressed }) => [styles.checkout, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.checkoutText}>Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingVertical: theme.space.lg, gap: theme.space.lg },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    padding: theme.space.xl,
  },
  emptyTitle: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.color.text,
  },
  emptyBody: {
    fontSize: theme.font.body,
    color: theme.color.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  thumbnail: { width: 84, height: 105 },
  rowBody: { flex: 1, gap: theme.space.xs },
  rowName: { fontSize: theme.font.body, color: theme.color.text },
  rowPrice: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.color.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginTop: theme.space.xs,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceAlt,
  },
  stepperIcon: {
    fontSize: theme.font.section,
    color: theme.color.text,
    lineHeight: 20,
  },
  quantity: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
  },
  remove: { marginLeft: 'auto' },
  removeText: { fontSize: theme.font.label, color: theme.color.danger },
  footer: {
    padding: theme.space.lg,
    gap: theme.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: theme.font.body, color: theme.color.textMuted },
  totalValue: {
    fontSize: theme.font.title,
    fontWeight: '800',
    color: theme.color.text,
  },
  checkout: {
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.text,
  },
  checkoutText: { color: '#fff', fontSize: theme.font.body, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
