import type { DyVariation } from './types';

/**
 * `variation.payload.data` no viene tipado porque su forma la decide la
 * plantilla de la campaña en la consola de DY, no el SDK. Si alguien cambia la
 * plantilla, la app recibe algo distinto sin que TypeScript se entere.
 *
 * Por eso las pantallas nunca leen `payload.data` directamente, sino a través
 * de estos validadores, que devuelven `null` en vez de reventar el render.
 */

/**
 * Datos de producto del feed de DY (`DefaultRecsProductData`).
 *
 * Llegan solo si el `choose` pide `recsProductData: { skusOnly: false }`; con
 * `skusOnly` DY devuelve únicamente el SKU y la tienda resuelve el resto.
 */
export interface DyProductData {
  sku: string;
  slotId?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
  url?: string;
  brand?: string;
  inStock?: boolean;
  categories?: string[];
}

/** Campaña de recomendaciones. */
export interface RecommendationPayload {
  slots: DyProductData[];
}

/** Campaña de contenido: los campos los define la plantilla en la consola. */
export interface BannerPayload {
  title: string;
  body: string;
  cta?: string;
  eyebrow?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const num = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  // El feed de DY puede traer los precios como cadena.
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/**
 * En las campañas CUSTOM_JSON el SDK entrega `payload.data` como **cadena JSON
 * sin parsear** (`CustomJsonPayload.data: string`), mientras que en las RECS
 * llega ya como objeto. Esta función absorbe esa diferencia.
 */
const asObject = (data: unknown): Record<string, unknown> | null => {
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(data) ? data : null;
};

/**
 * Un slot trae el SKU en la raíz y, si se pidieron, los datos de producto en
 * `productData`. Los nombres de campo son los del feed de DY (`image_url`,
 * `in_stock`), no camelCase.
 */
const toProductData = (slot: Record<string, unknown>): DyProductData | null => {
  const sku = str(slot.sku);
  if (!sku) {
    return null;
  }

  const product = isRecord(slot.productData) ? slot.productData : {};
  const categories = Array.isArray(product.categories)
    ? product.categories.filter((c): c is string => typeof c === 'string')
    : undefined;

  return {
    sku,
    slotId: str(slot.slotId),
    name: str(product.name),
    price: num(product.price),
    imageUrl: str(product.image_url),
    url: str(product.url),
    brand: str(product.brand),
    inStock: typeof product.in_stock === 'boolean' ? product.in_stock : undefined,
    categories: categories?.length ? categories : undefined,
  };
};

export const asRecommendationPayload = (
  variation: DyVariation | undefined,
): RecommendationPayload | null => {
  const data = asObject(variation?.payload?.data);
  if (!data || !Array.isArray(data.slots)) {
    return null;
  }

  const slots = data.slots
    .filter(isRecord)
    .map(toProductData)
    .filter((slot): slot is DyProductData => slot !== null);

  return slots.length > 0 ? { slots } : null;
};

export const asBannerPayload = (
  variation: DyVariation | undefined,
): BannerPayload | null => {
  const data = asObject(variation?.payload?.data);
  if (!data) {
    return null;
  }

  const title = str(data.title);
  const body = str(data.body);
  if (!title || !body) {
    return null;
  }

  return { title, body, cta: str(data.cta), eyebrow: str(data.eyebrow) };
};
