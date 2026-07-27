/**
 * Sistema visual de la demo.
 *
 * Paleta oscura con un acento cálido, pensada para que las tarjetas de producto
 * y las imágenes que devuelve el feed de DY destaquen sobre el fondo.
 */
export const theme = {
  color: {
    bg: '#0B0D12',
    bgElevated: '#12151C',
    surface: '#171B24',
    surfaceAlt: '#1F2430',
    border: '#282E3B',
    borderSoft: '#1E2430',

    text: '#F5F7FA',
    textMuted: '#98A2B3',
    textFaint: '#5C6675',

    accent: '#FF6B4A',
    accentSoft: '#FF8A6E',
    accentDim: 'rgba(255, 107, 74, 0.14)',

    info: '#4C8DFF',
    success: '#3FB27F',
    warning: '#E0A33E',
    danger: '#E5484D',

    /** Capas translúcidas para simular degradados sin dependencias nativas. */
    veilTop: 'rgba(255, 255, 255, 0.06)',
    veilBottom: 'rgba(0, 0, 0, 0.45)',
    scrim: 'rgba(11, 13, 18, 0.82)',
  },

  space: (n: number): number => n * 8,

  radius: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },

  font: {
    display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6 },
    title: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.3 },
    heading: { fontSize: 17, fontWeight: '700' as const },
    body: { fontSize: 14, fontWeight: '500' as const },
    small: { fontSize: 12, fontWeight: '500' as const },
    micro: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1.1 },
  },

  /** Sombras: iOS usa shadow*, Android solo elevation. */
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    glow: {
      shadowColor: '#FF6B4A',
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
  },

  /** Duraciones de animación, en ms. */
  motion: { fast: 140, base: 260, slow: 460, shimmer: 1100 },
} as const;

/**
 * Color estable derivado de una cadena. Se usa como fondo mientras carga la
 * imagen del producto, y como sustituto cuando el feed no trae `image_url`.
 */
export const tintFor = (seed: string): string => {
  const hue =
    Math.abs(
      Array.from(seed).reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7),
    ) % 360;
  return `hsl(${hue}, 42%, 32%)`;
};
