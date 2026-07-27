import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATALOG } from '../catalog';
import { ProductCard } from '../components/ProductCard';
import { RecommendationRail } from '../components/RecommendationRail';
import {
  asBannerPayload,
  SELECTORS,
  useChoose,
  type DyPageContext,
} from '../dy';
import { theme } from '../theme';

const HOME_CONTEXT: DyPageContext = {
  type: 'HOMEPAGE',
  data: [],
  locale: 'es_ES',
};

export const HomeScreen: React.FC<{
  onSelectProduct: (sku: string) => void;
}> = ({ onSelectProduct }) => {
  const bannerSelectors = useMemo(() => [SELECTORS.homeBanner], []);

  // `implicitPageview` deja que DY registre el pageview con esta misma llamada,
  // en vez de emitir un pageView() aparte.
  const { choices } = useChoose(bannerSelectors, HOME_CONTEXT, {
    implicitPageview: true,
  });
  const banner = asBannerPayload(choices[0]?.variations[0]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {banner && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerBody}>{banner.body}</Text>
          {banner.cta ? <Text style={styles.bannerCta}>{banner.cta} →</Text> : null}
        </View>
      )}

      <RecommendationRail
        title="Recomendado para ti"
        selector={SELECTORS.homeRecs}
        context={HOME_CONTEXT}
        onSelectProduct={onSelectProduct}
      />

      <Text style={styles.sectionTitle}>Todo el catálogo</Text>
      <View style={styles.grid}>
        {CATALOG.map(product => (
          <ProductCard
            key={product.sku}
            product={product}
            onPress={() => onSelectProduct(product.sku)}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: theme.space(4) },
  banner: {
    margin: theme.space(2),
    padding: theme.space(2),
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.accent,
    gap: 4,
  },
  bannerTitle: { color: theme.color.text, fontSize: 16, fontWeight: '700' },
  bannerBody: { color: theme.color.textMuted, fontSize: 13, lineHeight: 19 },
  bannerCta: { color: theme.color.accent, fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: theme.space(2),
    paddingTop: theme.space(2),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space(1.5),
    padding: theme.space(2),
  },
});
