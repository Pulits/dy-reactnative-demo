/**
 * Categoría — port de `CategoryView.swift`.
 *
 * Dos campañas sobre la misma página: "Most Popular in Category" y "Most
 * Affinity with in Category", que es el ranking personalizado ("Best for you").
 * Ambas reciben el nombre de la categoría por el custom attribute
 * `category-filter`, que es lo que lee su real-time filter.
 */

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { appConfig } from '../config/appConfig';
import { CategorySearchOverlay } from '../components/CategorySearchOverlay';
import { ProductRail } from '../components/ProductRail';
import { useDy } from '../dy/DyProvider';
import { useAsync } from '../hooks/useAsync';
import type { ProductCategory } from '../models';
import { EMPTY_RECOMMENDATIONS } from '../models';
import { theme } from '../theme';

export const CategoryScreen: React.FC<{ category: ProductCategory }> = ({
  category,
}) => {
  const dy = useDy();

  useEffect(() => {
    void dy.reportPageView('category', category);
  }, [dy, category]);

  const popular = useAsync(
    () =>
      dy.getCategoryRecs(category, appConfig.selectors.mostPopularInCategory),
    EMPTY_RECOMMENDATIONS,
    [dy, category],
  );

  const affinity = useAsync(
    () =>
      dy.getCategoryRecs(category, appConfig.selectors.mostAffinityInCategory),
    EMPTY_RECOMMENDATIONS,
    [dy, category],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{category}</Text>
      </View>

      <CategorySearchOverlay category={category} />

      <ProductRail
        title={affinity.data.title ?? 'Best for you'}
        products={affinity.data.products}
        loading={affinity.loading}
      />

      <ProductRail
        title={popular.data.title ?? `Most popular in ${category}`}
        products={popular.data.products}
        loading={popular.loading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingBottom: theme.space.xxl, gap: theme.space.xl },
  header: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.md },
  title: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.color.text,
  },
});
