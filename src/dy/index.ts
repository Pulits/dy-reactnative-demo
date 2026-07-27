/**
 * Punto de entrada de la capa DY.
 *
 * Las pantallas importan siempre desde aquí (`../dy`), nunca de un adaptador
 * concreto. Para pasar del cliente simulado al SDK real, basta con crear
 * `nativeClient.ts` implementando `DyClient` sobre
 * `@dynamicyield/react-native-sdk` y cambiar la factoría en `DyProvider.tsx`.
 */
export { DyProvider, useDy, usePageView, useChoose, useTrackEvent } from './DyProvider';
export { SELECTORS } from './mockClient';
export { DY_CONFIG, DY_API_KEY, hasRealApiKey } from './dyConfig';
export { asRecommendationPayload, asBannerPayload } from './payloads';
export type { RecommendationPayload, BannerPayload } from './payloads';
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
