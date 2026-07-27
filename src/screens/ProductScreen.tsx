import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bySku, formatPrice } from '../catalog';
import { RecommendationRail } from '../components/RecommendationRail';
import { SELECTORS, usePageView, useTrackEvent, type DyPageContext } from '../dy';
import { useCart } from '../state/CartContext';
import { theme } from '../theme';

export const ProductScreen: React.FC<{
  sku: string;
  onSelectProduct: (sku: string) => void;
}> = ({ sku, onSelectProduct }) => {
  const product = bySku(sku);
  const cart = useCart();
  const trackEvent = useTrackEvent();

  // En PRODUCT el contexto lleva el SKU visitado: es lo que DY usa para
  // segmentar y para alimentar las campañas de productos similares.
  const context = useMemo<DyPageContext>(
    () => ({
      type: 'PRODUCT',
      location: `dydemo://product/${sku}`,
      data: [sku],
      locale: 'es_ES',
    }),
    [sku],
  );

  usePageView(context);

  if (!product) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Producto no encontrado: {sku}</Text>
      </View>
    );
  }

  const handleAddToCart = (): void => {
    cart.add(product.sku);
    trackEvent({
      kind: 'addToCart',
      name: 'Add to Cart',
      value: product.price,
      currency: product.currency,
      productId: product.sku,
      quantity: 1,
      // El carrito resultante incluye la línea recién añadida.
      cart: [
        ...cart.toDyCart().filter(line => line.productId !== product.sku),
        {
          productId: product.sku,
          quantity:
            (cart.lines.find(line => line.sku === product.sku)?.quantity ?? 0) + 1,
          itemPrice: product.price,
        },
      ],
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: product.color }]} />

      <View style={styles.info}>
        <Text style={styles.category}>{product.category.toUpperCase()}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          {formatPrice(product.price, product.currency)}
        </Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={styles.sku}>SKU {product.sku}</Text>

        <Pressable
          onPress={handleAddToCart}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>Añadir al carrito</Text>
        </Pressable>
      </View>

      <RecommendationRail
        title="Productos similares"
        selector={SELECTORS.pdpRecs}
        context={context}
        onSelectProduct={onSelectProduct}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space(4) },
  hero: { height: 220, width: '100%' },
  info: { padding: theme.space(2), gap: theme.space(0.75) },
  category: { color: theme.color.textMuted, fontSize: 11, letterSpacing: 1.2 },
  name: { color: theme.color.text, fontSize: 24, fontWeight: '700' },
  price: { color: theme.color.accent, fontSize: 20, fontWeight: '700' },
  description: {
    color: theme.color.textMuted,
    fontSize: 14,
    lineHeight: 21,
    paddingTop: theme.space(0.5),
  },
  sku: { color: theme.color.border, fontSize: 11 },
  cta: {
    marginTop: theme.space(1.5),
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(1.75),
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.75 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  missing: { padding: theme.space(3) },
  missingText: { color: theme.color.textMuted },
});
