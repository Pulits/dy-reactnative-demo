/**
 * Modelos de dominio de la app — port de `Models.swift`.
 */

/** Un campo de información del producto (título + contenido) para el PDP. */
export interface ProductAttribute {
  title: string;
  value: string;
}

export interface Product {
  /** `group_id` del feed, p. ej. "1626678952045". */
  id: string;
  /** SKU del feed, p. ej. "ws09". Puede faltar; se cae a `id`. */
  sku?: string;
  name: string;
  price: number;
  imageUrl?: string;
  category: string;
  description?: string;
  inStock: boolean;

  /**
   * Metadata de engagement de DY, rellenada al parsear recomendaciones o
   * búsqueda. Sin `slotId` no se puede reportar SLOT_CLICK/SLOT_IMP, y sin
   * `decisionId` no se puede atribuir el click a la decisión.
   */
  slotId?: string;
  decisionId?: string;
  /** Los ids de variación del SDK son **numéricos**, no cadenas. */
  variationId?: number;

  /** Campos extra del feed (details, size & fit, delivery…) para el PDP. */
  infoAttributes?: ProductAttribute[];
  rating?: number;
  reviewCount?: number;
}

/** El SKU con el que hablar con DY: el del feed, o el group_id si no viene. */
export const skuOf = (product: Product): string => product.sku ?? product.id;

/**
 * Categorías top-level.
 *
 * El orden por defecto importa: es el que se ve cuando no hay afinidad, y está
 * elegido para que el reordenado por afinidad se note (Women, que suele tener
 * más afinidad, va la última).
 */
export const PRODUCT_CATEGORIES = [
  'Kids',
  'Home',
  'Beauty',
  'Men',
  'Women',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

/** Contenido servido por una campaña de banner. */
export interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  textColor: string;
  /** Texto del botón del hero. */
  ctaText?: string;
  /** Categoría a la que navega al tocarlo. */
  categoryName?: string;
}

/** Recomendaciones con su encabezado (title/subtitle vienen en el `custom`). */
export interface HomeRecommendations {
  title?: string;
  subtitle?: string;
  products: Product[];
}

export const EMPTY_RECOMMENDATIONS: HomeRecommendations = { products: [] };

/** Social proof del PDP. `performance` es el número que se interpola. */
export interface SocialProof {
  highlightedText: string;
  text: string;
  performance: string;
}

export interface SearchResults {
  query: string;
  /** "Did you mean": solo si el server corrigió y difiere de lo escrito. */
  correctedQuery?: string;
  total: number;
  products: Product[];
}

export const EMPTY_SEARCH: SearchResults = {
  query: '',
  total: 0,
  products: [],
};

/** Una galería de productos dentro de una respuesta del asistente. */
export interface MuseGallery {
  title?: string;
  products: Product[];
}

export interface MuseReply {
  text?: string;
  galleries: MuseGallery[];
  /** El asistente derivó la pregunta a atención al cliente. */
  isSupport: boolean;
  /** Se reenvía en el siguiente mensaje para mantener el hilo. */
  chatId?: string;
}

/** Pantalla inicial de Muse: config + productos, en una sola llamada. */
export interface MuseHome {
  assistantName: string;
  searchPlaceholder: string;
  suggestions: string[];
  products: Product[];
}

export interface InspirationOption {
  id: string;
  title: string;
  description: string;
  /** Lo que se manda a Shopping Muse al elegirla. */
  prompt: string;
}

// ---- Afinidad ---------------------------------------------------------------

export interface AffinityValue {
  name: string;
  score: number;
}

export interface AffinityDimension {
  name: string;
  values: AffinityValue[];
}

export interface AffinityProfile {
  cuid: string;
  cuidType: string;
  dimensions: AffinityDimension[];
}

// ---- Registro de actividad --------------------------------------------------

export type ActivityKind = 'pageView' | 'engagement' | 'event';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  date: number;
}
