import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bySku, type Product } from '../catalog';
import { asRecommendationPayload, useChoose, type DyPageContext } from '../dy';
import { theme } from '../theme';
import { ProductCard } from './ProductCard';

interface Props {
  title: string;
  selector: string;
  context: DyPageContext;
  onSelectProduct: (sku: string) => void;
}

/**
 * Carrusel alimentado por una campaña de recomendaciones de DY.
 *
 * Encapsula el ciclo completo: choose -> impresión -> click. Las pantallas solo
 * dicen qué selector quieren y en qué contexto están.
 */
export const RecommendationRail: React.FC<Props> = ({
  title,
  selector,
  context,
  onSelectProduct,
}) => {
  const selectors = useMemo(() => [selector], [selector]);
  const { choices, loading, error, reportClick } = useChoose(selectors, context);

  const choice = choices[0];
  const products = useMemo<Product[]>(() => {
    const payload = asRecommendationPayload(choice?.variations[0]);
    if (!payload) {
      return [];
    }
    // DY devuelve SKUs; el detalle del producto lo pone el catálogo de la tienda.
    return payload.slots
      .map(slot => bySku(slot.sku))
      .filter((product): product is Product => product !== undefined);
  }, [choice]);

  if (error) {
    return (
      <Section title={title}>
        <Text style={styles.muted}>
          No se pudo cargar la campaña: {error.message}
        </Text>
      </Section>
    );
  }

  if (loading) {
    return (
      <Section title={title}>
        <ActivityIndicator color={theme.color.accent} />
      </Section>
    );
  }

  // Sin variación asignada no se pinta nada: el usuario puede estar en el
  // grupo de control de la campaña.
  if (products.length === 0) {
    return null;
  }

  return (
    <Section title={title} subtitle={selector}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}>
        {products.map(product => (
          <ProductCard
            key={product.sku}
            product={product}
            onPress={() => {
              if (choice) {
                reportClick(choice);
              }
              onSelectProduct(product.sku);
            }}
          />
        ))}
      </ScrollView>
    </Section>
  );
};

const Section: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: { gap: theme.space(1), paddingVertical: theme.space(1.5) },
  title: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: theme.space(2),
  },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 11,
    paddingHorizontal: theme.space(2),
  },
  rail: { gap: theme.space(1.5), paddingHorizontal: theme.space(2) },
  muted: {
    color: theme.color.textMuted,
    paddingHorizontal: theme.space(2),
    fontSize: 13,
  },
});
