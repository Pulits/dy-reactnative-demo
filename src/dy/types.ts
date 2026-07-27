/**
 * Vocabulario de dominio de Dynamic Yield.
 *
 * Los nombres siguen la terminología de la Experience API (campaigns, selectors,
 * variations, decision id, page context), que es la misma que expone el SDK de
 * React Native. Mantener estos tipos separados del adaptador concreto permite
 * cambiar de implementación sin tocar las pantallas.
 */

/** Tipos de página que DY reconoce para segmentar y reportar pageviews. */
export type DyPageType =
  | 'HOMEPAGE'
  | 'CATEGORY'
  | 'PRODUCT'
  | 'CART'
  | 'OTHER';

/**
 * Contexto de la pantalla actual.
 *
 * `data` es el array de contexto que espera DY y su contenido depende de `type`:
 * en PRODUCT es el/los SKU, en CATEGORY la jerarquía de categorías, y en
 * HOMEPAGE/CART va vacío.
 */
export interface DyPageContext {
  type: DyPageType;
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
  /** API key de la sección de DY (una por plataforma/entorno). */
  apiKey: string;
  /** Data center donde vive la sección. */
  dataCenter: 'US' | 'EU';
  /** Consentimiento inicial. DY no lo persiste entre lanzamientos de la app. */
  consent: DyConsent;
  /** Envía los eventos a la consola en vez de silenciarlos. */
  debug?: boolean;
}

/** Identificadores de usuario y sesión que DY mantiene entre peticiones. */
export interface DyIdentity {
  dyid: string | null;
  dyidServer: string | null;
  sessionId: string | null;
}

/**
 * Payload de una variación. `data` es libre por diseño: lo define la plantilla
 * de la campaña en la consola de DY, así que las pantallas deben validarlo
 * antes de usarlo (ver `asRecommendationPayload`).
 */
export interface DyVariation {
  id: string;
  payload: {
    type: string;
    data: unknown;
  };
}

/** Una campaña resuelta para el usuario actual. */
export interface DyChoice {
  /** Id de la campaña. */
  id: string;
  /** Nombre del selector con el que se pidió. */
  name: string;
  variations: DyVariation[];
  /**
   * Identifica esta decisión concreta. Hay que devolverlo al reportar
   * impresiones y clicks para que DY atribuya el engagement a la variación.
   */
  decisionId: string;
}

export interface DyChooseRequest {
  /** Nombres de los selectores/campañas a resolver. */
  selectors: string[];
  context: DyPageContext;
  /**
   * Si es `true`, DY registra un pageview implícito con esta petición y no hace
   * falta llamar a `pageView` por separado.
   */
  implicitPageview?: boolean;
}

export interface DyChooseResult {
  choices: DyChoice[];
}

/** Evento de engagement sobre una variación ya servida. */
export type DyEngagementType = 'IMPRESSION' | 'CLICK';

export interface DyEngagement {
  type: DyEngagementType;
  decisionId: string;
  variationIds: string[];
}

/** Línea de carrito, tal y como la espera el evento de compra de DY. */
export interface DyCartLine {
  productId: string;
  quantity: number;
  itemPrice: number;
}

/**
 * Eventos de negocio. Los `dyType` son los identificadores canónicos de DY;
 * `custom` cubre cualquier evento definido en la consola.
 */
export type DyEvent =
  | {
      name: 'Add to Cart';
      dyType: 'add-to-cart-v1';
      value: number;
      currency: string;
      productId: string;
      quantity: number;
      cart: DyCartLine[];
    }
  | {
      name: 'Purchase';
      dyType: 'purchase-v1';
      value: number;
      currency: string;
      uniqueTransactionId: string;
      cart: DyCartLine[];
    }
  | {
      name: string;
      dyType: 'custom';
      properties: Record<string, string | number | boolean>;
    };

/**
 * Resultado de una campaña de Rollout (feature flags, SDK >= 1.4.0):
 * `true` el usuario ve la feature, `false` está en el grupo de control,
 * `null` no entra en el rollout.
 */
export type DyRolloutFlag = boolean | null;
