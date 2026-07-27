import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { bySku, formatPrice } from '../catalog';
import { FadeInUp } from '../components/motion';
import { RecommendationRail } from '../components/RecommendationRail';
import {
  SELECTORS,
  usePageView,
  useTrackEvent,
  type DyPageContext,
} from '../dy';
import { useCart } from '../state/CartContext';
import { theme, tintFor } from '../theme';

export const ProductScreen: React.FC<{
  sku: string;
  onSelectProduct: (sku: string) => void;
}> = ({ sku, onSelectProduct }) => {
  const product = bySku(sku);
  const cart = useCart();
  const trackEvent = useTrackEvent();
  const [added, setAdded] = useState(false);
  const ctaScale = useRef(new Animated.Value(1)).current;

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
        <Text style={styles.missingTitle}>Producto no encontrado</Text>
        <Text style={styles.missingBody}>
          DY recomendó {sku}, pero la tienda no lo tiene en catálogo.
        </Text>
      </View>
    );
  }

  const handleAddToCart = (): void => {
    cart.add(product.sku);
    setAdded(true);

    Animated.sequence([
      Animated.timing(ctaScale, {
        toValue: 0.95,
        duration: theme.motion.fast,
        useNativeDriver: true,
      }),
      Animated.spring(ctaScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

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
            (cart.lines.find(line => line.sku === product.sku)?.quantity ?? 0) +
            1,
          itemPrice: product.price,
        },
      ],
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: tintFor(product.sku) }]}>
        {product.imageUrl && (
          <Image
            source={{ uri: product.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        <View style={styles.heroVeil} pointerEvents="none" />
      </View>

      <FadeInUp style={styles.info}>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{product.category}</Text>
          </View>
          {!product.inStock && (
            <View style={[styles.tag, styles.tagWarn]}>
              <Text style={[styles.tagText, styles.tagWarnText]}>Agotado</Text>
            </View>
          )}
        </View>

        <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          {formatPrice(product.price, product.currency)}
        </Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={styles.sku}>SKU {product.sku}</Text>

        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <Pressable
            onPress={handleAddToCart}
            disabled={!product.inStock}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              !product.inStock && styles.ctaDisabled,
              pressed && styles.ctaPressed,
            ]}>
            <Text style={styles.ctaText}>
              {!product.inStock
                ? 'Sin stock'
                : added
                  ? '✓ Añadido al carrito'
                  : 'Añadir al carrito'}
            </Text>
          </Pressable>
        </Animated.View>
      </FadeInUp>

      <RecommendationRail
        title="Productos similares"
        subtitle="Basado en lo que estás viendo"
        selector={SELECTORS.pdpRecs}
        context={context}
        onSelectProduct={onSelectProduct}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space(5) },
  hero: { height: 300, width: '100%', overflow: 'hidden' },
  heroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.veilBottom,
    opacity: 0.28,
  },
  info: { padding: theme.space(2.5), gap: theme.space(0.75) },
  tags: { flexDirection: 'row', gap: theme.space(1) },
  tag: {
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(1.25),
    paddingVertical: 4,
  },
  tagWarn: { backgroundColor: 'rgba(229, 72, 77, 0.16)' },
  tagText: { ...theme.font.small, fontSize: 11, color: theme.color.textMuted },
  tagWarnText: { color: theme.color.danger },
  brand: { ...theme.font.micro, color: theme.color.textFaint, marginTop: 4 },
  name: { ...theme.font.display, color: theme.color.text, lineHeight: 36 },
  price: { fontSize: 24, fontWeight: '800', color: theme.color.accentSoft },
  description: {
    ...theme.font.body,
    color: theme.color.textMuted,
    lineHeight: 22,
    paddingTop: theme.space(0.5),
  },
  sku: { ...theme.font.small, fontSize: 11, color: theme.color.textFaint },
  cta: {
    marginTop: theme.space(2),
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(2),
    alignItems: 'center',
    ...theme.shadow.glow,
  },
  ctaDisabled: {
    backgroundColor: theme.color.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { ...theme.font.heading, color: '#fff' },
  missing: { padding: theme.space(4), gap: theme.space(1) },
  missingTitle: { ...theme.font.title, color: theme.color.text },
  missingBody: { ...theme.font.body, color: theme.color.textMuted },
});
