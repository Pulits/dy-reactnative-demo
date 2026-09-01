/**
 * Personalized Inspirations — port de `PersonalizedInspirationsView.swift`.
 *
 * Tres vibes; cada una manda su prompt a Shopping Muse y pinta las galerías
 * que devuelva. Es el mismo asistente que la pantalla de Muse, con prompts
 * fijos en vez de texto libre.
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
import type { MuseGallery } from '../models';
import { theme } from '../theme';
import { ProductRail, SectionHeader } from './ProductRail';

export const PersonalizedInspirations: React.FC = () => {
  const dy = useDy();
  const [selected, setSelected] = useState<string>();
  const [galleries, setGalleries] = useState<MuseGallery[]>([]);
  const [loading, setLoading] = useState(false);

  const choose = async (id: string, prompt: string): Promise<void> => {
    setSelected(id);
    setLoading(true);
    setGalleries([]);
    const reply = await dy.museChat(prompt);
    setGalleries(reply.galleries);
    setLoading(false);
  };

  const reset = (): void => {
    setSelected(undefined);
    setGalleries([]);
  };

  return (
    <View style={styles.root}>
      <SectionHeader
        title={appConfig.inspirations.title}
        subtitle={appConfig.inspirations.subtitle}
        action={
          selected ? (
            <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
              <Text style={styles.reset}>
                {appConfig.inspirations.resetText}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <Text style={styles.eyebrow}>{appConfig.inspirations.eyebrow}</Text>

      <View style={styles.options}>
        {appConfig.inspirations.options.map(option => {
          const active = option.id === selected;
          return (
            <Pressable
              key={option.id}
              onPress={() => void choose(option.id, option.prompt)}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[styles.optionTitle, active && styles.optionTitleActive]}
              >
                {option.title}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  active && styles.optionDescriptionActive,
                ]}
              >
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={appConfig.muse.primaryColor} />
          <Text style={styles.loadingText}>
            {appConfig.inspirations.loadingText}
          </Text>
        </View>
      )}

      {galleries.map((gallery, index) => (
        <ProductRail
          key={`${gallery.title ?? 'look'}-${index}`}
          title={gallery.title ?? appConfig.inspirations.resultsEyebrow}
          products={gallery.products}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: theme.space.md },
  eyebrow: {
    paddingHorizontal: theme.space.lg,
    fontSize: theme.font.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: appConfig.muse.primaryColor,
  },
  reset: { fontSize: theme.font.label, color: theme.color.textMuted },
  options: {
    flexDirection: 'row',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  option: {
    flex: 1,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: appConfig.muse.secondaryColor,
    gap: 2,
  },
  optionActive: { backgroundColor: appConfig.muse.primaryColor },
  optionTitle: {
    fontSize: theme.font.label,
    fontWeight: '700',
    color: theme.color.text,
  },
  optionTitleActive: { color: '#fff' },
  optionDescription: {
    fontSize: theme.font.caption,
    color: theme.color.textMuted,
  },
  optionDescriptionActive: { color: 'rgba(255,255,255,0.85)' },
  pressed: { opacity: 0.75 },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.lg,
  },
  loadingText: { fontSize: theme.font.label, color: theme.color.textMuted },
});
