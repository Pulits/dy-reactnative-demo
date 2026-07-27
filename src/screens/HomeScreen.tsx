import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATALOG, productToDisplay } from '../catalog';
import { HeroBanner } from '../components/HeroBanner';
import { FadeInUp } from '../components/motion';
import { ProductCard } from '../components/ProductCard';
import { RecommendationRail } from '../components/RecommendationRail';
import {
  asBannerPayload,
  SELECTORS,
  useChoose,
  type DyPageContext,
} from '../dy';
import { theme } from '../theme';

// DY exige `pageLocation`. En una app nativa no hay URL, así que se usa un
// esquema propio estable que sirva para segmentar en la consola.
const HOME_CONTEXT: DyPageContext = {
  type: 'HOMEPAGE',
  location: 'dydemo://home',
  data: [],
  locale: 'es_ES',
};

export const HomeScreen: React.FC<{
  onSelectProduct: (sku: string) => void;
}> = ({ onSelectProduct }) => {
  const bannerSelectors = useMemo(() => [SELECTORS.homeBanner], []);

  // `implicitPageview` deja que DY registre el pageview con esta misma llamada,
  // en vez de emitir un pageView() aparte.
  const { choices, loading } = useChoose(bannerSelectors, HOME_CONTEXT, {
    implicitPageview: true,
  });
  const banner = asBannerPayload(choices[0]?.variations[0]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <HeroBanner banner={banner} loading={loading} />

      <RecommendationRail
        title="Recomendado para ti"
        subtitle="Personalizado según tu actividad"
        selector={SELECTORS.homeRecs}
        context={HOME_CONTEXT}
        onSelectProduct={onSelectProduct}
      />

      <View style={styles.catalogHead}>
        <Text style={styles.sectionTitle}>Todo el catálogo</Text>
        <Text style={styles.sectionCount}>{CATALOG.length} artículos</Text>
      </View>

      <View style={styles.grid}>
        {CATALOG.map((product, index) => (
          <FadeInUp
            key={product.sku}
            delay={index * 45}
            style={styles.gridItem}>
            <ProductCard
              product={productToDisplay(product)}
              variant="grid"
              onPress={() => onSelectProduct(product.sku)}
            />
          </FadeInUp>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space(5) },
  catalogHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space(2.5),
    paddingTop: theme.space(1),
  },
  sectionTitle: { ...theme.font.title, color: theme.color.text },
  sectionCount: { ...theme.font.small, color: theme.color.textFaint },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.space(2),
    padding: theme.space(2.5),
  },
  gridItem: { width: '48%' },
});
