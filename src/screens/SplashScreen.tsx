/**
 * Splash — port de `SplashView.swift`.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FadeInUp } from '../components/motion';
import { theme } from '../theme';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({
  onFinish,
}) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 1400);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.root}>
      <FadeInUp>
        <Text style={styles.mark}>Blueberry</Text>
        <Text style={styles.tagline}>Personalized by Dynamic Yield</Text>
      </FadeInUp>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.brand,
  },
  mark: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    marginTop: theme.space.sm,
    fontSize: theme.font.label,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
});
