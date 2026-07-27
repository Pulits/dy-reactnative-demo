import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bySku, CURRENCY, formatPrice, productToDisplay } from '../catalog';
import { FadeInUp } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { usePageView, useTrackEvent, type DyPageContext } from '../dy';
import { useCart } from '../state/CartContext';
import { theme } from '../theme';

export const CartScreen: React.FC<{ onContinue: () => void }> = ({
  onContinue,
}) => {
  const cart = useCart();
  const trackEvent = useTrackEvent();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      cart.lines.flatMap(line => {
        const product = bySku(line.sku);
        return product ? [{ ...line, product }] : [];
      }),
    [cart.lines],
  );

  // El contexto de CART lleva los SKUs del carrito: DY los usa para segmentar
  // y para campañas de recuperación.
  const context = useMemo<DyPageContext>(
    () => ({
      type: 'CART',
      location: 'dydemo://cart',
      data: cart.lines.map(line => line.sku),
      locale: 'es_ES',
    }),
    [cart.lines],
  );

  usePageView(context);

  const handlePurchase = (): void => {
    // El id de transacción debe ser único: DY lo usa para deduplicar compras.
    const transactionId = `TX-${Date.now()}`;

    trackEvent({
      kind: 'purchase',
      name: 'Purchase',
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
      <FadeInUp style={styles.empty}>
        <View style={styles.tick}>
          <Text style={styles.tickMark}>✓</Text>
        </View>
        <Text style={styles.emptyTitle}>Pedido confirmado</Text>
        <Text style={styles.emptyBody}>
          Se envió el evento de compra a Dynamic Yield con el id{' '}
          <Text style={styles.mono}>{confirmation}</Text>. Ábrelo en el panel DY
          para ver el payload exacto.
        </Text>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          style={styles.ghostCta}>
          <Text style={styles.ghostCtaText}>Volver a la tienda</Text>
        </Pressable>
      </FadeInUp>
    );
  }

  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🎒</Text>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptyBody}>
          Añade algo para ver el evento de compra viajar a DY.
        </Text>
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          style={styles.ghostCta}>
          <Text style={styles.ghostCtaText}>Ver productos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {lines.map((line, index) => (
        <FadeInUp key={line.sku} delay={index * 60}>
          <View style={styles.lineWrap}>
            <ProductCard
              product={productToDisplay(line.product)}
              variant="row"
              onPress={() => {}}
            />
            <View style={styles.qty}>
              <Pressable
                onPress={() => cart.remove(line.sku)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar una unidad de ${line.product.name}`}
                style={styles.qtyButton}>
                <Text style={styles.qtySign}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{line.quantity}</Text>
              <Pressable
                onPress={() => cart.add(line.sku)}
                accessibilityRole="button"
                accessibilityLabel={`Añadir una unidad de ${line.product.name}`}
                style={styles.qtyButton}>
                <Text style={styles.qtySign}>+</Text>
              </Pressable>
            </View>
          </View>
        </FadeInUp>
      ))}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatPrice(cart.total)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Envío</Text>
          <Text style={[styles.summaryValue, styles.free]}>Gratis</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(cart.total)}</Text>
        </View>
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
  content: { padding: theme.space(2.5), gap: theme.space(1.5) },
  lineWrap: { gap: theme.space(1) },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: theme.space(1.5),
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySign: { color: theme.color.text, fontSize: 18, fontWeight: '700' },
  qtyValue: {
    ...theme.font.body,
    color: theme.color.text,
    minWidth: 18,
    textAlign: 'center',
  },
  summary: {
    marginTop: theme.space(1),
    padding: theme.space(2),
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    gap: theme.space(1),
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...theme.font.body, color: theme.color.textMuted },
  summaryValue: { ...theme.font.body, color: theme.color.text },
  free: { color: theme.color.success },
  divider: { height: 1, backgroundColor: theme.color.border },
  totalLabel: { ...theme.font.heading, color: theme.color.text },
  totalValue: { fontSize: 21, fontWeight: '800', color: theme.color.accentSoft },
  cta: {
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(2),
    alignItems: 'center',
    ...theme.shadow.glow,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { ...theme.font.heading, color: '#fff' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space(4),
    gap: theme.space(1.25),
  },
  emptyEmoji: { fontSize: 44 },
  tick: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.color.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickMark: { fontSize: 30, color: '#fff', fontWeight: '800' },
  emptyTitle: { ...theme.font.title, color: theme.color.text },
  emptyBody: {
    ...theme.font.body,
    color: theme.color.textMuted,
    lineHeight: 21,
    textAlign: 'center',
  },
  mono: { color: theme.color.accentSoft },
  ghostCta: {
    marginTop: theme.space(1),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space(2.5),
    paddingVertical: theme.space(1.25),
  },
  ghostCtaText: { ...theme.font.body, color: theme.color.text },
});
