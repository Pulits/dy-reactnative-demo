/**
 * Búsquedas populares por categoría — port de `CategorySearchOverlay.swift`.
 *
 * Las sugerencias son estáticas (viven en la config, como en iOS), pero al
 * tocarlas se lanza una búsqueda semántica real, restringida a la categoría con
 * un string filter sobre `categories`.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { appConfig } from '../config/appConfig';
import { useDy } from '../dy/DyProvider';
import type { ProductCategory, SearchResults } from '../models';
import { theme } from '../theme';
import { ProductRail } from './ProductRail';

export const CategorySearchOverlay: React.FC<{
  category: ProductCategory;
}> = ({ category }) => {
  const dy = useDy();
  const [results, setResults] = useState<SearchResults>();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string>();

  const searches = appConfig.categoryPopularSearches[category] ?? [];
  if (searches.length === 0) {
    return null;
  }

  const run = async (query: string): Promise<void> => {
    setActive(query);
    setLoading(true);
    void dy.reportKeywordSearch(query);
    const found = await dy.semanticSearch(
      query,
      appConfig.categorySearchResultLimit,
      category,
    );
    setResults(found);
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{appConfig.categorySearchTitle}</Text>

      <View style={styles.chips}>
        {searches.map(search => (
          <Pressable
            key={search}
            onPress={() => void run(search)}
            style={({ pressed }) => [
              styles.chip,
              active === search && styles.chipActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.chipText,
                active === search && styles.chipTextActive,
              ]}
            >
              {search}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && (
        <ActivityIndicator style={styles.spinner} color={theme.color.brand} />
      )}

      {!!results && !loading && (
        <>
          {!!results.correctedQuery && (
            <Text style={styles.didYouMean}>
              Did you mean{' '}
              <Text style={styles.didYouMeanTerm}>
                {results.correctedQuery}
              </Text>
              ?
            </Text>
          )}
          <ProductRail products={results.products} cardWidth={140} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: theme.space.md },
  title: {
    paddingHorizontal: theme.space.lg,
    fontSize: theme.font.label,
    color: theme.color.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  chip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
  },
  chipActive: {
    backgroundColor: theme.color.text,
    borderColor: theme.color.text,
  },
  chipText: { fontSize: theme.font.label, color: theme.color.text },
  chipTextActive: { color: '#fff' },
  pressed: { opacity: 0.7 },
  spinner: { alignSelf: 'flex-start', marginLeft: theme.space.lg },
  didYouMean: {
    paddingHorizontal: theme.space.lg,
    fontSize: theme.font.label,
    color: theme.color.textMuted,
  },
  didYouMeanTerm: { fontWeight: '700', color: theme.color.text },
});
