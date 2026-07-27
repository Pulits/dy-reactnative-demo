import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { BannerPayload } from '../dy';
import { theme } from '../theme';
import { FadeInUp, Skeleton } from './motion';

/**
 * Cabecera de la home servida por una campaña de contenido (CUSTOM_JSON).
 *
 * El degradado se simula con capas translúcidas apiladas, para no arrastrar una
 * dependencia nativa más solo por el fondo.
 */
export const HeroBanner: React.FC<{
  banner: BannerPayload | null;
  loading: boolean;
}> = ({ banner, loading }) => {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <Skeleton width="100%" height={168} radius={theme.radius.lg} />
      </View>
    );
  }

  if (!banner) {
    return null;
  }

  return (
    <FadeInUp style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.glowA} pointerEvents="none" />
        <View style={styles.glowB} pointerEvents="none" />

        <View style={styles.content}>
          <Text style={styles.eyebrow}>
            {(banner.eyebrow ?? 'Seleccionado para ti').toUpperCase()}
          </Text>
          <Text style={styles.title}>{banner.title}</Text>
          <Text style={styles.body}>{banner.body}</Text>
          {banner.cta ? (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{banner.cta}</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </View>
          ) : null}
        </View>
      </View>
    </FadeInUp>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.space(2.5), paddingTop: theme.space(1) },
  hero: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  // Dos halos desplazados dan sensación de degradado diagonal.
  glowA: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.color.accent,
    opacity: 0.22,
  },
  glowB: {
    position: 'absolute',
    bottom: -90,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.color.info,
    opacity: 0.14,
  },
  content: { padding: theme.space(2.5), gap: theme.space(0.75) },
  eyebrow: { ...theme.font.micro, color: theme.color.accentSoft },
  title: { ...theme.font.display, color: theme.color.text, lineHeight: 36 },
  body: {
    ...theme.font.body,
    color: theme.color.textMuted,
    lineHeight: 20,
    maxWidth: '92%',
  },
  cta: {
    marginTop: theme.space(1),
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space(0.75),
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(2),
    paddingVertical: theme.space(1.25),
    ...theme.shadow.glow,
  },
  ctaText: { ...theme.font.body, color: '#fff', fontWeight: '700' },
  ctaArrow: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
