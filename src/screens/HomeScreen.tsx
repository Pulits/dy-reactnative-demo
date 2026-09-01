/**
 * Home — port de `HomeView.swift`.
 *
 * Orden de secciones igual que en iOS: hero, carrusel de banners, categorías,
 * recomendaciones, inspiraciones y banner inferior, con el activador de Muse
 * flotando encima.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { appConfig } from '../config/appConfig';
import {
  BannerCarousel,
  HeroBanner,
  MuseActivatorBanner,
} from '../components/Banners';
import { PersonalizedInspirations } from '../components/PersonalizedInspirations';
import { ProductRail, SectionHeader } from '../components/ProductRail';
import { FadeInUp } from '../components/motion';
import { useDy, useDyState } from '../dy/DyProvider';
import { useAsync } from '../hooks/useAsync';
import type { Campaign, ProductCategory } from '../models';
import { EMPTY_RECOMMENDATIONS, PRODUCT_CATEGORIES } from '../models';
import { useNavigation } from '../navigation/NavigationContext';
import { theme } from '../theme';

export const HomeScreen: React.FC = () => {
  const dy = useDy();
  const { dyidResetCounter } = useDyState();
  const { push } = useNavigation();

  // Al regenerar el dyid, iOS vuelve al orden por defecto en vez de conservar
  // el de la identidad anterior. Se replica reseteando aquí.
  const [categories, setCategories] = useState<ProductCategory[]>([
    ...PRODUCT_CATEGORIES,
  ]);
  const [banners, setBanners] = useState<Campaign[]>([]);

  const hero = useAsync(() => dy.getHeroBanner(), undefined, [
    dy,
    dyidResetCounter,
  ]);

  const recs = useAsync(() => dy.getRecommendations(), EMPTY_RECOMMENDATIONS, [
    dy,
    dyidResetCounter,
  ]);

  const bottomBanner = useAsync(
    () => dy.getBanner(appConfig.selectors.bottomBanner),
    undefined,
    [dy, dyidResetCounter],
  );

  const loadBanners = useCallback(async () => {
    const loaded = await Promise.all(
      appConfig.selectors.homeBanners.map(selector => dy.getBanner(selector)),
    );
    return loaded.filter((c): c is Campaign => !!c);
  }, [dy]);

  const bannerState = useAsync(loadBanners, [] as Campaign[], [
    dy,
    dyidResetCounter,
  ]);

  useEffect(() => {
    void dy.reportPageView('home');
  }, [dy, dyidResetCounter]);

  // Un solo fetch de afinidad ordena el carrusel de categorías y los banners.
  // Sin afinidad utilizable se conserva el orden por defecto.
  useEffect(() => {
    let cancelled = false;
    setCategories([...PRODUCT_CATEGORIES]);

    void dy.categoryAffinityOrder().then(order => {
      if (cancelled || !order) {
        return;
      }
      setCategories(order);
      setBanners(current => dy.reorderCampaigns(current, order));
    });

    return () => {
      cancelled = true;
    };
  }, [dy, dyidResetCounter]);

  useEffect(() => {
    setBanners(bannerState.data);
  }, [bannerState.data]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroBanner campaign={hero.data} loading={hero.loading} />

        <FadeInUp delay={60}>
          <BannerCarousel campaigns={banners} loading={bannerState.loading} />
        </FadeInUp>

        <FadeInUp delay={120}>
          <View style={styles.section}>
            <SectionHeader title="Shop by category" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map(category => (
                <Pressable
                  key={category}
                  onPress={() => push({ name: 'category', category })}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.categoryChipText}>{category}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </FadeInUp>

        <FadeInUp delay={180}>
          <ProductRail
            title={recs.data.title ?? 'Recommended for you'}
            subtitle={recs.data.subtitle}
            products={recs.data.products}
            loading={recs.loading}
          />
        </FadeInUp>

        <FadeInUp delay={240}>
          <PersonalizedInspirations />
        </FadeInUp>

        {!!bottomBanner.data && (
          <FadeInUp delay={300}>
            <BannerCarousel campaigns={[bottomBanner.data]} loading={false} />
          </FadeInUp>
        )}
      </ScrollView>

      <View style={styles.floating} pointerEvents="box-none">
        <MuseActivatorBanner />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  content: { paddingBottom: 140, gap: theme.space.xl },
  section: { gap: theme.space.md },
  categoryRow: { paddingHorizontal: theme.space.lg, gap: theme.space.sm },
  categoryChip: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceAlt,
  },
  categoryChipText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
  },
  pressed: { opacity: 0.7 },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.space.lg,
  },
});
