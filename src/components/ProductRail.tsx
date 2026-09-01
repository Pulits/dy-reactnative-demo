/**
 * Carrusel horizontal de productos.
 *
 * Reporta SLOT_IMP una sola vez por conjunto de productos. iOS reporta la
 * impresión al aparecer la sección; aquí se hace igual, al montar con datos, y
 * se guarda la firma para no volver a reportar en cada re-render.
 */

import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDy } from '../dy/DyProvider';
import type { Product } from '../models';
import { theme } from '../theme';
import { ProductCard } from './ProductCard';
import { Skeleton } from './motion';

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <View style={styles.headerRow}>
    <View style={styles.headerText}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {action}
  </View>
);

export const ProductRail: React.FC<{
  title?: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  cardWidth?: number;
}> = ({ title, subtitle, products, loading = false, cardWidth = 156 }) => {
  const dy = useDy();
  const reported = useRef<string>('');

  useEffect(() => {
    if (products.length === 0) {
      return;
    }
    const signature = products.map(p => p.slotId ?? p.id).join('|');
    if (reported.current === signature) {
      return;
    }
    reported.current = signature;
    void dy.reportRecommendationImpressions(products);
  }, [dy, products]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {!!title && <SectionHeader title={title} subtitle={subtitle} />}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {loading
          ? [0, 1, 2].map(key => (
              <View key={key} style={{ width: cardWidth, gap: theme.space.sm }}>
                <Skeleton
                  width={cardWidth}
                  height={cardWidth * 1.25}
                  radius={theme.radius.md}
                />
                <Skeleton width="70%" height={13} />
                <Skeleton width="40%" height={13} />
              </View>
            ))
          : products.map(product => (
              <ProductCard
                key={`${product.id}-${product.slotId ?? ''}`}
                product={product}
                width={cardWidth}
              />
            ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: theme.space.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg,
    gap: theme.space.md,
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontSize: theme.font.section,
    fontWeight: '700',
    color: theme.color.text,
  },
  subtitle: { fontSize: theme.font.label, color: theme.color.textMuted },
  rail: { paddingHorizontal: theme.space.lg, gap: theme.space.md },
});
