import type { DyVariation } from './types';

/**
 * `variation.payload.data` es `unknown` a propósito: su forma la decide la
 * plantilla de la campaña en la consola de DY, no el SDK. Si alguien cambia la
 * plantilla, la app recibe algo distinto sin que TypeScript se entere.
 *
 * Por eso las pantallas nunca leen `payload.data` directamente, sino a través
 * de estos validadores, que devuelven `null` en vez de reventar el render.
 */

/** Campaña de recomendaciones: DY devuelve los SKUs a mostrar. */
export interface RecommendationPayload {
  slots: Array<{ sku: string }>;
}

/** Campaña de contenido simple: título y texto editables desde la consola. */
export interface BannerPayload {
  title: string;
  body: string;
  cta?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const asRecommendationPayload = (
  variation: DyVariation | undefined,
): RecommendationPayload | null => {
  const data = variation?.payload?.data;
  if (!isRecord(data) || !Array.isArray(data.slots)) {
    return null;
  }

  const slots = data.slots
    .filter(isRecord)
    .map(slot => slot.sku)
    .filter((sku): sku is string => typeof sku === 'string' && sku.length > 0)
    .map(sku => ({ sku }));

  return slots.length > 0 ? { slots } : null;
};

export const asBannerPayload = (
  variation: DyVariation | undefined,
): BannerPayload | null => {
  const data = variation?.payload?.data;
  if (!isRecord(data)) {
    return null;
  }

  const { title, body, cta } = data;
  if (typeof title !== 'string' || typeof body !== 'string') {
    return null;
  }

  return { title, body, cta: typeof cta === 'string' ? cta : undefined };
};
