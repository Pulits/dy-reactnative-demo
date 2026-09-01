/**
 * Sistema visual de Blueberry.
 *
 * El morado de marca (#7C5CFC) es el mismo que usa la app de iOS para Muse y
 * los acentos, así que las dos versiones se ven como la misma tienda.
 */

export const theme = {
  color: {
    brand: '#7C5CFC',
    brandSoft: '#EAF0FF',
    brandDeep: '#4B32C3',
    accent: '#FF7A45',

    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F4F7',
    surfaceSunken: '#EDEDF2',

    text: '#12121A',
    textMuted: '#6B6B7B',
    textFaint: '#9A9AAB',
    onBrand: '#FFFFFF',

    border: '#E4E4EC',
    borderStrong: '#D2D2DE',

    success: '#1B9E5A',
    danger: '#D93025',
    star: '#F5A623',

    veil: 'rgba(0,0,0,0.45)',
    veilSoft: 'rgba(0,0,0,0.06)',
  },

  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },

  radius: { sm: 8, md: 12, lg: 18, pill: 999 },

  font: {
    display: 28,
    title: 22,
    section: 17,
    body: 15,
    label: 13,
    caption: 11,
  },

  motion: { fast: 140, base: 240, slow: 420, shimmer: 1500 },
} as const;

/** Formatea un precio, como el `asCurrency` de iOS. */
export const formatPrice = (value: number, symbol = '$'): string =>
  `${symbol}${value.toFixed(2)}`;
