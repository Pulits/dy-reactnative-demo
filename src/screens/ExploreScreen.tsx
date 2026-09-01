/**
 * Explore — port de `ExploreView` (dentro de `ContentView.swift`).
 *
 * Con el buscador vacío enseña las categorías y "Most Popular"; al escribir,
 * hace búsqueda semántica con spellcheck. La búsqueda visual queda anotada
 * abajo: necesita un selector de fotos, que es dependencia nativa.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { appConfig } from '../config/appConfig';
import { ProductCard } from '../components/ProductCard';
import { ProductRail, SectionHeader } from '../components/ProductRail';
import { useDy, useDyState } from '../dy/DyProvider';
import { useAsync } from '../hooks/useAsync';
import type { SearchResults } from '../models';
import { EMPTY_RECOMMENDATIONS, PRODUCT_CATEGORIES } from '../models';
import { useNavigation } from '../navigation/NavigationContext';
import { theme } from '../theme';

export const ExploreScreen: React.FC = () => {
  const dy = useDy();
  const { dyidResetCounter } = useDyState();
  const { push } = useNavigation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>();
  const [searching, setSearching] = useState(false);

  const popular = useAsync(
    () => dy.getRecommendations(appConfig.selectors.searchOverlayRecs),
    EMPTY_RECOMMENDATIONS,
    [dy, dyidResetCounter],
  );

  // Debounce: sin él se lanzaría una búsqueda por pulsación de tecla.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(undefined);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void dy.reportKeywordSearch(trimmed);
      void dy.semanticSearch(trimmed).then(found => {
        if (!cancelled) {
          setResults(found);
          setSearching(false);
        }
      });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dy, query]);

  const browsing = !results && !searching;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products..."
          placeholderTextColor={theme.color.textFaint}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {browsing && (
        <>
          <View style={styles.section}>
            <SectionHeader title="Categories" />
            <View style={styles.categoryGrid}>
              {PRODUCT_CATEGORIES.map(category => (
                <Pressable
                  key={category}
                  onPress={() => push({ name: 'category', category })}
                  style={({ pressed }) => [
                    styles.categoryTile,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.categoryTileText}>{category}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ProductRail
            title={popular.data.title ?? 'Most popular'}
            products={popular.data.products}
            loading={popular.loading}
          />
        </>
      )}

      {searching && (
        <ActivityIndicator style={styles.spinner} color={theme.color.brand} />
      )}

      {!!results && !searching && (
        <View style={styles.section}>
          <SectionHeader
            title={`${results.total} result${results.total === 1 ? '' : 's'}`}
            subtitle={
              results.correctedQuery
                ? `Did you mean "${results.correctedQuery}"?`
                : undefined
            }
          />
          <View style={styles.resultGrid}>
            {results.products.map(product => (
              <ProductCard
                key={`${product.id}-${product.slotId ?? ''}`}
                product={product}
                width={160}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingBottom: theme.space.xxl, gap: theme.space.xl },
  header: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    gap: theme.space.md,
  },
  title: {
    fontSize: theme.font.display,
    fontWeight: '800',
    color: theme.color.text,
  },
  search: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceAlt,
    fontSize: theme.font.body,
    color: theme.color.text,
  },
  section: { gap: theme.space.md },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  categoryTile: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceAlt,
  },
  categoryTileText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  spinner: { marginTop: theme.space.lg },
  pressed: { opacity: 0.7 },
});
