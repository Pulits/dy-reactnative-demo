import type { DyVariation } from './types';

/**
 * `variation.payload.data` no viene tipado porque su forma la decide la
 * plantilla de la campaña en la consola de DY, no el SDK. Si alguien cambia la
 * plantilla, la app recibe algo distinto sin que TypeScript se entere.
 *
 * Por eso las pantallas nunca leen `payload.data` directamente, sino a través
 * de estos validadores, que devuelven `null` en vez de reventar el render.
 */

/** Campaña de recomendaciones: DY devuelve los SKUs a mostrar. */
export interface RecommendationPayload {
  slots: Array<{ sku: string; slotId?: string }>;
}

/** Campaña de contenido: los campos los define la plantilla en la consola. */
export interface BannerPayload {
  title: string;
  body: string;
  cta?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

export const asRecommendationPayload = (
  variation: DyVariation | undefined,
): RecommendationPayload | null => {
  const data = asObject(variation?.payload?.data);
  if (!data || !Array.isArray(data.slots)) {
    return null;
  }

  const slots = data.slots
    .filter(isRecord)
    .filter(
      (slot): slot is { sku: string; slotId?: string } =>
        typeof slot.sku === 'string' && slot.sku.length > 0,
    )
    .map(slot => ({ sku: slot.sku, slotId: slot.slotId }));

  return slots.length > 0 ? { slots } : null;
};

export const asBannerPayload = (
  variation: DyVariation | undefined,
): BannerPayload | null => {
  const data = asObject(variation?.payload?.data);
  if (!data) {
    return null;
  }

  const { title, body, cta } = data;
  if (typeof title !== 'string' || typeof body !== 'string') {
    return null;
  }

  return { title, body, cta: typeof cta === 'string' ? cta : undefined };
};
