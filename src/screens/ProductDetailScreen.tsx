/**
 * Ficha de producto — port de `ProductDetailView.swift`.
 *
 * Concentra cuatro llamadas a DY: el pageview de producto con el SKU real, la
 * campaña de social proof, los similares (`PDP Recs`) y "Complete the Look",
 * que va por Shopping Muse con un prompt que inyecta el SKU.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { appConfig } from '../config/appConfig';
import { ProductImage, StarRating } from '../components/ProductCard';
import { ProductRail } from '../components/ProductRail';
import { useDy } from '../dy/DyProvider';
import { useAsync } from '../hooks/useAsync';
import type { MuseGallery, Product } from '../models';
import { EMPTY_RECOMMENDATIONS, skuOf } from '../models';
import { useCart } from '../state/CartContext';
import { useWishlist } from '../state/WishlistContext';
import { formatPrice, theme } from '../theme';

export const ProductDetailScreen: React.FC<{ product: Product }> = ({
  product,
}) => {
  const dy = useDy();
  const cart = useCart();
  const wishlist = useWishlist();
  const { width } = useWindowDimensions();

  const [look, setLook] = useState<MuseGallery[]>([]);
  const [lookLoading, setLookLoading] = useState(false);

  const saved = wishlist.contains(product);
  const sku = skuOf(product);

  useEffect(() => {
    void dy.reportProductView(product);
  }, [dy, product]);

  const similar = useAsync(
    () => dy.getPdpRecommendations(product.id, product.sku),
    EMPTY_RECOMMENDATIONS,
    [dy, product.id],
  );

  const socialProof = useAsync(
    () => dy.getSocialProof(product.id, product.sku),
    undefined,
    [dy, product.id],
  );

  const completeLook = async (): Promise<void> => {
    setLookLoading(true);
    const reply = await dy.completeTheLook(product);
    setLook(
      reply.galleries.map(gallery => ({
        ...gallery,
        products: gallery.products.slice(0, appConfig.completeLook.maxProducts),
      })),
    );
    setLookLoading(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProductImage
          uri={product.imageUrl}
          style={{ width, height: width * 1.15 }}
        />

        <View style={styles.header}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>

          <View style={styles.metaRow}>
            {product.rating !== undefined && (
              <StarRating
                rating={product.rating}
                reviews={product.reviewCount}
              />
            )}
            <Text style={styles.sku}>SKU {sku}</Text>
          </View>

          {!product.inStock && (
            <Text style={styles.outOfStock}>Out of stock</Text>
          )}
        </View>

        {!!socialProof.data && (
          <View style={styles.socialProof}>
            <Text style={styles.socialProofHighlight}>
              {socialProof.data.highlightedText}
            </Text>
            <Text style={styles.socialProofText}>
              {socialProof.data.performance} {socialProof.data.text}
            </Text>
          </View>
        )}

        {!!product.description && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Description</Text>
            <Text style={styles.blockBody}>{product.description}</Text>
          </View>
        )}

        {product.infoAttributes?.map(attribute => (
          <View key={attribute.title} style={styles.block}>
            <Text style={styles.blockTitle}>{attribute.title}</Text>
            <Text style={styles.blockBody}>{attribute.value}</Text>
          </View>
        ))}

        <View style={styles.lookSection}>
          <Text style={styles.blockTitle}>{appConfig.completeLook.title}</Text>
          {look.length === 0 && !lookLoading && (
            <Pressable
              onPress={() => void completeLook()}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>
                Style this with Muse
              </Text>
            </Pressable>
          )}
          {lookLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={appConfig.muse.primaryColor} />
              <Text style={styles.loadingText}>
                {appConfig.completeLook.loadingText}
              </Text>
            </View>
          )}
        </View>

        {look.map((gallery, index) => (
          <ProductRail
            key={`look-${index}`}
            title={gallery.title}
            products={gallery.products}
            cardWidth={140}
          />
        ))}

        <ProductRail
          title={similar.data.title ?? 'You may also like'}
          products={similar.data.products}
          loading={similar.loading}
        />
      </ScrollView>

      <View style={styles.bar}>
        <Pressable
          onPress={() => wishlist.toggle(product)}
          style={({ pressed }) => [
            styles.wishButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            saved ? 'Quitar de la wishlist' : 'Añadir a la wishlist'
          }
        >
          <Text style={[styles.wishIcon, saved && styles.wishIconOn]}>
            {saved ? '♥' : '♡'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => cart.addItem(product)}
          disabled={!product.inStock}
          style={({ pressed }) => [
            styles.addButton,
            !product.inStock && styles.addButtonOff,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>
            {product.inStock ? 'Add to Cart' : 'Out of stock'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingBottom: theme.space.xxl, gap: theme.space.xl },
  header: { paddingHorizontal: theme.space.lg, gap: theme.space.xs },
  name: {
    fontSize: theme.font.title,
    fontWeight: '700',
    color: theme.color.text,
  },
  price: {
    fontSize: theme.font.title,
    fontWeight: '800',
    color: theme.color.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginTop: theme.space.xs,
  },
  sku: { fontSize: theme.font.caption, color: theme.color.textFaint },
  outOfStock: {
    marginTop: theme.space.xs,
    fontSize: theme.font.label,
    color: theme.color.danger,
    fontWeight: '600',
  },
  socialProof: {
    marginHorizontal: theme.space.lg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: '#FFF4EC',
    gap: 2,
  },
  socialProofHighlight: {
    fontSize: theme.font.body,
    fontWeight: '800',
    color: theme.color.accent,
  },
  socialProofText: { fontSize: theme.font.label, color: theme.color.textMuted },
  block: { paddingHorizontal: theme.space.lg, gap: theme.space.xs },
  blockTitle: {
    fontSize: theme.font.section,
    fontWeight: '700',
    color: theme.color.text,
  },
  blockBody: {
    fontSize: theme.font.body,
    lineHeight: 22,
    color: theme.color.textMuted,
  },
  lookSection: { paddingHorizontal: theme.space.lg, gap: theme.space.md },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: appConfig.muse.secondaryColor,
  },
  secondaryButtonText: {
    fontSize: theme.font.label,
    fontWeight: '700',
    color: appConfig.muse.primaryColor,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  loadingText: { fontSize: theme.font.label, color: theme.color.textMuted },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  wishButton: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceAlt,
  },
  wishIcon: { fontSize: 22, color: theme.color.textMuted },
  wishIconOn: { color: theme.color.brand },
  addButton: {
    flex: 1,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.text,
  },
  addButtonOff: { backgroundColor: theme.color.borderStrong },
  addButtonText: {
    color: '#fff',
    fontSize: theme.font.body,
    fontWeight: '700',
  },
  pressed: { opacity: 0.75 },
});
