import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

import { theme } from '../theme';

/**
 * Primitivas de animación construidas sobre la `Animated` API de React Native.
 *
 * Todas usan `useNativeDriver` donde es posible, así la animación corre en el
 * hilo de UI y no se entrecorta mientras el hilo de JS resuelve las llamadas a
 * Dynamic Yield.
 */

/** Entrada con fundido y desplazamiento vertical. */
export const FadeInUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}> = ({ children, delay = 0, distance = 14, style }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: theme.motion.slow,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
};

/**
 * Bloque de carga con brillo recorriendo la superficie.
 *
 * Ocupa el hueco exacto de lo que va a aparecer, para que la llegada de las
 * campañas de DY no descoloque el layout.
 */
export const Skeleton: React.FC<{
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}> = ({ width, height, radius = theme.radius.sm, style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: theme.motion.shimmer,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View
      style={[
        { width, height, borderRadius: radius },
        styles.skeleton,
        style,
      ]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.shimmer,
          {
            opacity: shimmer.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.15, 0.45, 0.15],
            }),
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-160, 160],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
};

/**
 * Contador que transiciona al cambiar de valor, con un pequeño rebote.
 * Se usa en el badge del carrito.
 */
export const usePopOnChange = (value: number): Animated.Value => {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;

    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.35,
        duration: theme.motion.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [value, scale]);

  return scale;
};

const styles = StyleSheet.create({
  skeleton: { backgroundColor: theme.color.surfaceAlt, overflow: 'hidden' },
  shimmer: { backgroundColor: theme.color.veilTop },
});
