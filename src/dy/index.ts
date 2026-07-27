/**
 * Punto de entrada de la capa DY.
 *
 * Las pantallas importan siempre desde aquí (`../dy`), nunca de un adaptador
 * concreto. `createDyClient` elige en tiempo de ejecución entre el adaptador
 * nativo (SDK real) y el simulado.
 *
 * `nativeClient` NO se reexporta a propósito: un import estático arrastraría el
 * TurboModule del SDK al bundle de los tests, donde no existe y revienta al
 * cargarse. `createClient` lo carga con `require` solo si está disponible.
 */
export { DyProvider, useDy, usePageView, useChoose, useTrackEvent } from './DyProvider';
export { SELECTORS } from './mockClient';
export { createDyClient, isNativeSdkAvailable, activeClientKind } from './createClient';
export { DY_CONFIG, DY_API_KEY, hasRealApiKey } from './dyConfig';
export { asRecommendationPayload, asBannerPayload } from './payloads';
export type {
  RecommendationPayload,
  BannerPayload,
  DyProductData,
} from './payloads';
export type { DyClient, DyLogEntry, ObservableDyClient } from './DyClient';
export type {
  DyCartLine,
  DyChoice,
  DyChooseRequest,
  DyChooseResult,
  DyConfig,
  DyConsent,
  DyEngagement,
  DyEngagementType,
  DyEvent,
  DyIdentity,
  DyPageContext,
  DyPageType,
  DyRolloutFlag,
  DyVariation,
} from './types';
