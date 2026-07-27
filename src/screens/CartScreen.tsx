import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bySku, CURRENCY, formatPrice } from '../catalog';
import { usePageView, useTrackEvent, type DyPageContext } from '../dy';
import { useCart } from '../state/CartContext';
import { theme } from '../theme';

const CART_CONTEXT: DyPageContext = { type: 'CART', data: [], locale: 'es_ES' };

export const CartScreen: React.FC<{ onContinue: () => void }> = ({
  onContinue,
}) => {
  const cart = useCart();
  const trackEvent = useTrackEvent();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  usePageView(CART_CONTEXT);

  const lines = useMemo(
    () =>
      cart.lines.flatMap(line => {
        const product = bySku(line.sku);
        return product ? [{ ...line, product }] : [];
      }),
    [cart.lines],
  );

  const handlePurchase = (): void => {
    // El id de transacción debe ser único: DY lo usa para deduplicar compras.
    const transactionId = `TX-${Date.now()}`;

    trackEvent({
      name: 'Purchase',
      dyType: 'purchase-v1',
      value: Number(cart.total.toFixed(2)),
      currency: CURRENCY,
      uniqueTransactionId: transactionId,
      cart: cart.toDyCart(),
    });

    setConfirmation(transactionId);
    cart.clear();
  };

  if (confirmation) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Pedido confirmado</Text>
        <Text style={styles.emptyBody}>
          Se ha enviado el evento de compra a Dynamic Yield con el id{' '}
          {confirmation}. Ábrelo en el panel de actividad para ver el payload.
        </Text>
        <Pressable onPress={onContinue} accessibilityRole="button">
          <Text style={styles.link}>Volver a la tienda</Text>
        </Pressable>
      </View>
    );
  }

  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Pressable onPress={onContinue} accessibilityRole="button">
          <Text style={styles.link}>Ver productos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {lines.map(line => (
        <View key={line.sku} style={styles.line}>
          <View style={[styles.thumb, { backgroundColor: line.product.color }]} />
          <View style={styles.lineBody}>
            <Text style={styles.lineName}>{line.product.name}</Text>
            <Text style={styles.lineMeta}>
              {line.quantity} × {formatPrice(line.product.price)}
            </Text>
          </View>
          <Pressable
            onPress={() => cart.remove(line.sku)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar una unidad de ${line.product.name}`}>
            <Text style={styles.remove}>−</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
      </View>

      <Pressable
        onPress={handlePurchase}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
        <Text style={styles.ctaText}>Finalizar compra</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: theme.space(2), gap: theme.space(1.5) },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(1.5),
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: theme.space(1.25),
  },
  thumb: { width: 52, height: 52, borderRadius: theme.radius.sm },
  lineBody: { flex: 1, gap: 2 },
  lineName: { color: theme.color.text, fontSize: 14, fontWeight: '600' },
  lineMeta: { color: theme.color.textMuted, fontSize: 12 },
  remove: {
    color: theme.color.textMuted,
    fontSize: 26,
    paddingHorizontal: theme.space(1),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.space(1),
  },
  totalLabel: { color: theme.color.textMuted, fontSize: 15 },
  totalValue: { color: theme.color.text, fontSize: 20, fontWeight: '700' },
  cta: {
    backgroundColor: theme.color.success,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(1.75),
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.75 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space(3),
    gap: theme.space(1),
  },
  emptyTitle: { color: theme.color.text, fontSize: 18, fontWeight: '700' },
  emptyBody: {
    color: theme.color.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  link: { color: theme.color.accent, fontSize: 15, fontWeight: '600' },
});
