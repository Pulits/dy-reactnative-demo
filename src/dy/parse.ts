/**
 * Parseo de las respuestas de Dynamic Yield.
 *
 * Aislado del cliente a propósito: es la parte con reglas reales (campos que
 * llegan en varios tipos, HTML incrustado, `custom` sin parsear) y la que más
 * merece tests.
 */

import type { Product, ProductAttribute } from '../models';
import type {
  DyCustomJsonPayload,
  DyPayload,
  DyProductData,
  DyRecsPayload,
  DySlot,
} from './types';

/** El string recortado, o `undefined` si queda vacío. */
export const nonEmpty = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

/**
 * Convierte HTML a texto plano.
 *
 * Los textos del asistente y las descripciones del feed llegan con markup. iOS
 * lo resuelve con `NSAttributedString`; aquí se quitan los tags y se decodifican
 * las entidades habituales. `<br>` y `</p>` pasan a salto de línea para no
 * pegar frases que en el original iban separadas.
 */
export const htmlToPlainText = (html: string): string =>
  html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (match, entity: string) => {
      const key = entity.toLowerCase();
      if (ENTITIES[key]) {
        return ENTITIES[key];
      }
      if (key.startsWith('#')) {
        const code = Number(key.slice(1));
        return Number.isFinite(code) ? String.fromCharCode(code) : match;
      }
      return match;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Lee un número del `extra`, que puede traerlo como número o como cadena. */
export const numericExtra = (
  extra: Record<string, unknown>,
  key: string,
): number | undefined => {
  const raw = extra[key];
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : undefined;
  }
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/**
 * Payload de una campaña de contenido como objeto.
 *
 * En las campañas RECS el payload llega ya como objeto, pero en las CUSTOM_JSON
 * el SDK entrega `data` como **cadena JSON sin parsear**. Esta función absorbe
 * la diferencia.
 */
export const extractPayload = (
  payload: DyPayload | undefined,
): Record<string, unknown> | undefined => {
  if (!payload) {
    return undefined;
  }
  const data = (payload as DyCustomJsonPayload).data;
  if (typeof data === 'string') {
    return parseJsonObject(data);
  }
  if (data && typeof data === 'object') {
    return data as Record<string, unknown>;
  }
  return undefined;
};

/** JSON → objeto, o `undefined` si no es un objeto JSON válido. */
export const parseJsonObject = (
  raw: string | undefined,
): Record<string, unknown> | undefined => {
  if (!raw?.trim()) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

/** El encabezado (title/subtitle) que la campaña manda en el campo `custom`. */
export const parseRecsHeader = (
  custom: string | undefined,
): { title?: string; subtitle?: string } => {
  const json = parseJsonObject(custom);
  if (!json) {
    return {};
  }
  return {
    title: nonEmpty(json.title as string),
    subtitle: nonEmpty(json.subtitle as string),
  };
};

/** `true` si el payload es de recomendaciones. */
export const isRecsPayload = (
  payload: DyPayload | undefined,
): payload is DyRecsPayload =>
  !!payload &&
  typeof (payload as DyRecsPayload).data === 'object' &&
  Array.isArray((payload as DyRecsPayload).data?.slots);

// ---- Atributos de información del producto ----------------------------------

/** Tokens que marcan una key del `extra` como campo de "info" del PDP. */
const INFO_TOKENS = [
  'detail',
  'size',
  'fit',
  'delivery',
  'return',
  'shipping',
  'material',
  'composition',
  'fabric',
  'care',
  'spec',
  'feature',
];

/** `description` ya se pinta aparte. */
const INFO_SKIP = ['description'];

/** Orden de los paneles: primero los conocidos, luego alfabético. */
const INFO_PRIORITY = [
  'detail',
  'size',
  'fit',
  'material',
  'composition',
  'fabric',
  'care',
  'delivery',
  'shipping',
  'return',
];

/** "size_and_fit" → "Size And Fit". */
export const prettifyAttributeKey = (key: string): string =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export const parseInfoAttributes = (
  extra: Record<string, unknown>,
): ProductAttribute[] => {
  const attributes: ProductAttribute[] = [];

  for (const [rawKey, rawValue] of Object.entries(extra)) {
    const key = rawKey.toLowerCase();
    if (INFO_SKIP.includes(key)) {
      continue;
    }
    if (!INFO_TOKENS.some(token => key.includes(token))) {
      continue;
    }
    if (typeof rawValue !== 'string') {
      continue;
    }
    const clean = htmlToPlainText(rawValue);
    if (!clean) {
      continue;
    }
    attributes.push({ title: prettifyAttributeKey(rawKey), value: clean });
  }

  const rank = (title: string): number => {
    const lower = title.toLowerCase();
    const index = INFO_PRIORITY.findIndex(token => lower.includes(token));
    return index === -1 ? INFO_PRIORITY.length : index;
  };

  return attributes.sort((a, b) => {
    const ra = rank(a.title);
    const rb = rank(b.title);
    return ra === rb ? a.title.localeCompare(b.title) : ra - rb;
  });
};

// ---- Producto ---------------------------------------------------------------

export interface SlotContext {
  fallbackCategory?: string;
  decisionId?: string;
  variationId?: number;
}

/**
 * Convierte el `productData` de un slot en un `Product`.
 *
 * Devuelve `undefined` si faltan los campos sin los que no se puede pintar
 * nada (group_id, nombre o precio): mejor un hueco menos en el carrusel que
 * una tarjeta rota.
 */
export const parseProduct = (
  slot: DySlot,
  context: SlotContext = {},
): Product | undefined => {
  const pd: DyProductData | undefined = slot.productData;
  if (!pd) {
    return undefined;
  }

  const price =
    typeof pd.price === 'string' ? Number(pd.price) : pd.price ?? NaN;

  if (!pd.groupId || !pd.name || !Number.isFinite(price)) {
    return undefined;
  }

  const extra = pd.extra ?? {};
  const category =
    pd.categories?.find((c): c is string => !!c) ??
    context.fallbackCategory ??
    '';
  const description = nonEmpty(extra.description as string);
  const rating = numericExtra(extra, 'type:number:rating');
  const reviews = numericExtra(extra, 'type:number:reviews');

  return {
    id: pd.groupId,
    sku: nonEmpty(extra.sku as string) ?? pd.groupId,
    name: pd.name,
    price,
    imageUrl: nonEmpty(pd.imageUrl),
    category,
    description: description ? htmlToPlainText(description) : undefined,
    inStock: pd.inStock ?? true,
    slotId: nonEmpty(slot.slotId),
    decisionId: context.decisionId,
    variationId: context.variationId,
    infoAttributes: parseInfoAttributes(extra),
    rating,
    reviewCount: reviews === undefined ? undefined : Math.round(reviews),
  };
};

/** Mapea los slots de una variación, descartando los que no se pueden pintar. */
export const parseProducts = (
  slots: DySlot[],
  context: SlotContext = {},
): Product[] =>
  slots
    .map(slot => parseProduct(slot, context))
    .filter((p): p is Product => !!p);
