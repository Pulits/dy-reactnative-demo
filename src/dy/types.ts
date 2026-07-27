/**
 * Vocabulario de dominio de Dynamic Yield.
 *
 * Estos tipos están calcados de la API real de `@dynamicyield/react-native-sdk`
 * (v1.5.0), pero viven aparte a propósito: las pantallas dependen de esta capa,
 * no del SDK, así que el adaptador simulado y el nativo son intercambiables.
 */

/** Espejo de `PageType` del SDK. */
export type DyPageType =
  | 'HOMEPAGE'
  | 'CATEGORY'
  | 'PRODUCT'
  | 'CART'
  | 'OTHER';

/**
 * Contexto de la pantalla actual.
 *
 * `location` es obligatorio en el SDK (`pageLocation`): DY lo trata como la URL
 * de la pantalla y lo usa para segmentar. En una app nativa no hay URL real, así
 * que se usa un esquema propio estable, p.ej. `dydemo://product/SKU-1001`.
 *
 * `data` depende de `type`: en PRODUCT es el SKU, en CATEGORY la jerarquía de
 * categorías, en CART los SKUs del carrito, y en HOMEPAGE va vacío.
 */
export interface DyPageContext {
  type: DyPageType;
  location: string;
  data: string[];
  /** Locale del usuario, p.ej. `es_ES`. */
  locale: string;
}

/** Consentimiento activo (Active Consent, SDK >= 1.5.0). */
export interface DyConsent {
  /** `false` desactiva el tracking consentido, manteniendo campañas no personalizadas. */
  granted: boolean;
}

export interface DyConfig {
  /** API key **client-side** de la sección de DY. */
  apiKey: string;
  /** Espejo de `DataCenter` del SDK. */
  dataCenter: 'US' | 'EU';
  /** DY no persiste el consentimiento entre lanzamientos de la app. */
  consent: DyConsent;
  locale: string;
  debug?: boolean;
}

/**
 * Identificadores que mantiene el SDK.
 *
 * Solo estos dos: `getDyId()` y `getSessionId()`. No hay equivalente móvil del
 * `dyid_server` de la API web.
 */
export interface DyIdentity {
  dyid: string | null;
  sessionId: string | null;
}

/**
 * Variación servida por una campaña.
 *
 * `id` es **numérico** en el SDK, no una cadena — y es lo que espera
 * `reportImpression`/`reportClick`.
 */
export interface DyVariation {
  id: number;
  payload: {
    /** Espejo de `DecisionType`: CUSTOM_JSON, RECS, SORT, SEARCH... */
    type: string;
    /**
     * Sin tipar a propósito. En las campañas RECS es un objeto con `slots`;
     * en las CUSTOM_JSON el SDK lo entrega como **cadena JSON sin parsear**.
     * Ver `payloads.ts`.
     */
    data: unknown;
  };
  /** Solo lo traen las variaciones de campañas de Rollout. */
  rolloutFlag?: boolean;
}

/** Campaña resuelta para el usuario actual. */
export interface DyChoice {
  id: string;
  name: string;
  /** Espejo de `ChoiceType`: DECISION, RECS_DECISION, NO_DECISION... */
  type: string;
  variations: DyVariation[];
  /**
   * Identifica esta decisión concreta; hay que devolverlo al reportar
   * engagement. El SDK lo declara opcional: en `NO_DECISION` no viene.
   */
  decisionId?: string;
}

export interface DyChooseRequest {
  /** Nombres de los selectores/campañas a resolver. */
  selectors: string[];
  context: DyPageContext;
  /** Deja que DY registre el pageview en la misma llamada. */
  implicitPageview?: boolean;
}

export interface DyChooseResult {
  choices: DyChoice[];
}

export type DyEngagementType = 'IMPRESSION' | 'CLICK';

export interface DyEngagement {
  type: DyEngagementType;
  decisionId: string;
  /** Ids numéricos de variación, como los espera el SDK. */
  variationIds: number[];
}

/** Espejo de `CartInnerItem` del SDK. */
export interface DyCartLine {
  productId: string;
  quantity: number;
  itemPrice: number;
}

/**
 * Eventos de negocio.
 *
 * Cada variante mapea a un método concreto de `events` en el SDK:
 * `reportAddToCartEvent`, `reportPurchaseEvent` y `reportCustomEvent`.
 */
export type DyEvent =
  | {
      kind: 'addToCart';
      name: string;
      value: number;
      currency: string;
      productId: string;
      quantity: number;
      cart: DyCartLine[];
    }
  | {
      kind: 'purchase';
      name: string;
      value: number;
      currency: string;
      uniqueTransactionId: string;
      cart: DyCartLine[];
    }
  | {
      kind: 'custom';
      name: string;
      properties: Record<string, string | number | boolean>;
    };

/**
 * Resultado de una campaña de Rollout:
 * `true` el usuario ve la feature, `false` está en el grupo de control,
 * `null` no entra en el rollout.
 */
export type DyRolloutFlag = boolean | null;
