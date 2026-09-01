/**
 * Campañas de contenido: hero, carrusel de banners y el activador de Muse.
 *
 * Todas son campañas CUSTOM_JSON de DY salvo el activador, que es estático:
 * en iOS su texto vive en `Configuration.swift`, no en una campaña.
 */

import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { appConfig } from '../config/appConfig';
import { useDy } from '../dy/DyProvider';
import type { Campaign, ProductCategory } from '../models';
import { PRODUCT_CATEGORIES } from '../models';
import { useNavigation } from '../navigation/NavigationContext';
import { theme } from '../theme';
import { Skeleton } from './motion';

/** La categoría del payload, solo si es una de las nuestras. */
const asCategory = (name?: string): ProductCategory | undefined =>
  PRODUCT_CATEGORIES.find(c => c.toLowerCase() === name?.toLowerCase());

export const HeroBanner: React.FC<{
  campaign?: Campaign;
  loading: boolean;
}> = ({ campaign, loading }) => {
  const { width } = useWindowDimensions();
  const { push } = useNavigation();
  const dy = useDy();
  const height = Math.round(width * 0.82);

  if (loading) {
    return <Skeleton width="100%" height={height} radius={0} />;
  }
  if (!campaign) {
    return null;
  }

  const category = asCategory(campaign.categoryName);

  const onPress = (): void => {
    void dy.reportRecommendationClick({
      id: campaign.id,
      name: campaign.title,
      price: 0,
      category: campaign.categoryName ?? '',
      inStock: true,
    });
    if (category) {
      push({ name: 'category', category });
    }
  };

  return (
    <ImageBackground
      source={campaign.imageUrl ? { uri: campaign.imageUrl } : undefined}
      style={[styles.hero, { height }]}
      resizeMode="cover"
    >
      <View style={styles.heroVeil} />
      <View style={styles.heroContent}>
        <Text style={[styles.heroTitle, { color: campaign.textColor }]}>
          {campaign.title}
        </Text>
        {!!campaign.subtitle && (
          <Text style={[styles.heroSubtitle, { color: campaign.textColor }]}>
            {campaign.subtitle}
          </Text>
        )}
        {!!campaign.ctaText && (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.heroCtaText}>{campaign.ctaText}</Text>
          </Pressable>
        )}
      </View>
    </ImageBackground>
  );
};

export const BannerCarousel: React.FC<{
  campaigns: Campaign[];
  loading: boolean;
}> = ({ campaigns, loading }) => {
  const { push } = useNavigation();
  const cardWidth = 232;

  if (!loading && campaigns.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}
    >
      {loading
        ? [0, 1].map(key => (
            <Skeleton
              key={key}
              width={cardWidth}
              height={140}
              radius={theme.radius.md}
            />
          ))
        : campaigns.map(campaign => {
            const category = asCategory(campaign.categoryName);
            return (
              <Pressable
                key={campaign.id}
                disabled={!category}
                onPress={() => category && push({ name: 'category', category })}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <ImageBackground
                  source={
                    campaign.imageUrl ? { uri: campaign.imageUrl } : undefined
                  }
                  style={[styles.bannerCard, { width: cardWidth }]}
                  imageStyle={styles.bannerImage}
                  resizeMode="cover"
                >
                  <View style={styles.bannerVeil} />
                  <View style={styles.bannerText}>
                    <Text style={styles.bannerTitle} numberOfLines={1}>
                      {campaign.title}
                    </Text>
                    {!!campaign.subtitle && (
                      <Text style={styles.bannerSubtitle} numberOfLines={2}>
                        {campaign.subtitle}
                      </Text>
                    )}
                  </View>
                </ImageBackground>
              </Pressable>
            );
          })}
    </ScrollView>
  );
};

/** Banner que abre Shopping Muse. */
export const MuseActivatorBanner: React.FC = () => {
  const { push } = useNavigation();

  return (
    <Pressable
      onPress={() => push({ name: 'muse' })}
      style={({ pressed }) => [styles.muse, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.museSparkle}>✦</Text>
      <View style={styles.museText}>
        <Text style={styles.museTitle}>{appConfig.muse.bannerText}</Text>
        <Text style={styles.museSubtitle}>{appConfig.muse.welcomeMessage}</Text>
      </View>
      <View style={styles.museCta}>
        <Text style={styles.museCtaText}>{appConfig.muse.bannerCta}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },

  hero: { justifyContent: 'flex-end', backgroundColor: theme.color.surfaceAlt },
  heroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.veil,
  },
  heroContent: { padding: theme.space.xl, gap: theme.space.sm },
  heroTitle: {
    fontSize: theme.font.display,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: { fontSize: theme.font.body, opacity: 0.92, lineHeight: 21 },
  heroCta: {
    alignSelf: 'flex-start',
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.pill,
    backgroundColor: '#fff',
  },
  heroCtaText: {
    color: theme.color.text,
    fontWeight: '700',
    fontSize: theme.font.body,
  },

  carousel: { paddingHorizontal: theme.space.lg, gap: theme.space.md },
  bannerCard: {
    height: 140,
    justifyContent: 'flex-end',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.color.surfaceAlt,
  },
  bannerImage: { borderRadius: theme.radius.md },
  bannerVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  bannerText: { padding: theme.space.md, gap: 2 },
  bannerTitle: {
    color: '#fff',
    fontSize: theme.font.section,
    fontWeight: '700',
  },
  bannerSubtitle: { color: '#fff', fontSize: theme.font.label, opacity: 0.9 },

  muse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginHorizontal: theme.space.lg,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: appConfig.muse.secondaryColor,
  },
  museSparkle: { fontSize: 22, color: appConfig.muse.primaryColor },
  museText: { flex: 1, gap: 2 },
  museTitle: {
    fontSize: theme.font.body,
    fontWeight: '700',
    color: theme.color.text,
  },
  museSubtitle: { fontSize: theme.font.caption, color: theme.color.textMuted },
  museCta: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: appConfig.muse.primaryColor,
  },
  museCtaText: { color: '#fff', fontWeight: '700', fontSize: theme.font.label },
});
