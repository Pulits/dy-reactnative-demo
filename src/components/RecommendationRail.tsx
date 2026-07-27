import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { toDisplayProduct, type DisplayProduct } from '../catalog';
import { asRecommendationPayload, useChoose, type DyPageContext } from '../dy';
import { theme } from '../theme';
import { FadeInUp } from './motion';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

interface Props {
  title: string;
  subtitle?: string;
  selector: string;
  context: DyPageContext;
  onSelectProduct: (sku: string) => void;
}

/**
 * Carrusel alimentado por una campaña de recomendaciones de DY.
 *
 * Encapsula el ciclo completo: choose → impresión → click. Las pantallas solo
 * dicen qué selector quieren y en qué contexto están.
 */
export const RecommendationRail: React.FC<Props> = ({
  title,
  subtitle,
  selector,
  context,
  onSelectProduct,
}) => {
  const selectors = useMemo(() => [selector], [selector]);
  const { choices, loading, error, reportClick } = useChoose(selectors, context);

  const choice = choices[0];
  const products = useMemo<DisplayProduct[]>(() => {
    const payload = asRecommendationPayload(choice?.variations[0]);
    return payload ? payload.slots.map(toDisplayProduct) : [];
  }, [choice]);

  if (error) {
    return (
      <Section title={title}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>No se pudo cargar la campaña</Text>
          <Text style={styles.errorBody}>{error.message}</Text>
        </View>
      </Section>
    );
  }

  if (loading) {
    return (
      <Section title={title} subtitle={subtitle}>
        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}>
          {[0, 1, 2].map(index => (
            <ProductCardSkeleton key={index} />
          ))}
        </ScrollView>
      </Section>
    );
  }

  // Sin variación asignada no se pinta nada: el usuario puede estar en el grupo
  // de control de la campaña, y un carrusel vacío sería peor que ninguno.
  if (products.length === 0) {
    return null;
  }

  const servedByDy = products.some(product => product.source === 'dy');

  return (
    <Section
      title={title}
      subtitle={subtitle}
      meta={servedByDy ? 'datos del feed de DY' : 'SKUs de DY · datos locales'}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        decelerationRate="fast"
        snapToInterval={176 + theme.space(1.5)}>
        {products.map((product, index) => (
          <FadeInUp key={product.sku} delay={index * 70}>
            <ProductCard
              product={product}
              badge={index === 0 ? 'PARA TI' : undefined}
              onPress={() => {
                if (choice) {
                  reportClick(choice);
                }
                onSelectProduct(product.sku);
              }}
            />
          </FadeInUp>
        ))}
      </ScrollView>
    </Section>
  );
};

const Section: React.FC<{
  title: string;
  subtitle?: string;
  meta?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, meta, children }) => (
  <View style={styles.section}>
    <View style={styles.head}>
      <View style={styles.headText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {meta ? (
        <View style={styles.chip}>
          <View style={styles.dot} />
          <Text style={styles.chipText}>{meta}</Text>
        </View>
      ) : null}
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: { gap: theme.space(1.5), paddingVertical: theme.space(2) },
  head: {
    paddingHorizontal: theme.space(2.5),
    gap: theme.space(0.75),
  },
  headText: { gap: 2 },
  title: { ...theme.font.title, color: theme.color.text },
  subtitle: { ...theme.font.small, color: theme.color.textMuted },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(0.75),
    backgroundColor: theme.color.accentDim,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(1.25),
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color.accent,
  },
  chipText: { ...theme.font.small, fontSize: 11, color: theme.color.accentSoft },
  rail: { gap: theme.space(1.5), paddingHorizontal: theme.space(2.5) },
  errorBox: {
    marginHorizontal: theme.space(2.5),
    padding: theme.space(2),
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.danger,
    gap: 4,
  },
  errorTitle: { ...theme.font.body, color: theme.color.text },
  errorBody: { ...theme.font.small, color: theme.color.textMuted },
});
