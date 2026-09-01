/**
 * Frontera con el SDK de Dynamic Yield.
 *
 * Cada método mapea 1:1 con una llamada del SDK y no interpreta nada: el
 * parseo de payloads y la elección de selectores viven en `DyService`. Así el
 * adaptador nativo se limita a traducir tipos, y el simulado a devolver datos
 * con la misma forma.
 */

import type {
  DyAssistantResult,
  DyCartLine,
  DyChooseRequest,
  DyChooseResult,
  DyConfig,
  DyEventValue,
  DyPage,
  DyResult,
  DySearchFilter,
  DySearchResult,
} from './types';

export interface DyClient {
  // ---- Ciclo de vida e identidad -------------------------------------------

  initialize(config: DyConfig): Promise<void>;

  /** El dyid que asignó DY. Vacío hasta el primer Choose. */
  getDyId(): Promise<string>;

  getSessionId(): Promise<string>;

  /**
   * Borra dyid y sesión locales. El servidor no asigna los nuevos hasta la
   * siguiente llamada a Choose: un pageview no sirve, exige una sesión ya
   * válida y responde 422 justo después del reset.
   */
  resetUserIdAndSessionId(): Promise<void>;

  setActiveConsentAccepted(accepted: boolean): Promise<void>;

  // ---- Pageviews ------------------------------------------------------------

  reportHomePageView(location: string): Promise<DyResult>;
  reportCategoryPageView(
    location: string,
    categories: string[],
  ): Promise<DyResult>;
  reportProductPageView(location: string, sku: string): Promise<DyResult>;
  reportCartPageView(location: string, cart: string[]): Promise<DyResult>;
  reportOtherPageView(location: string, data: string): Promise<DyResult>;

  // ---- Choose ---------------------------------------------------------------

  chooseVariations(request: DyChooseRequest): Promise<DyChooseResult>;

  // ---- Eventos --------------------------------------------------------------

  reportAddToCart(args: {
    eventName: string;
    value: number;
    currency: string;
    productId: string;
    quantity: number;
    cart: DyCartLine[];
  }): Promise<DyResult>;

  reportRemoveFromCart(args: {
    eventName: string;
    value: number;
    currency: string;
    productId: string;
    quantity: number;
    cart: DyCartLine[];
  }): Promise<DyResult>;

  reportSyncCart(args: {
    eventName: string;
    value: number;
    currency: string;
    cart: DyCartLine[];
  }): Promise<DyResult>;

  reportPurchase(args: {
    eventName: string;
    value: number;
    currency: string;
    /** Para que DY deduplique la compra si se reintenta. */
    uniqueTransactionId: string;
    cart: DyCartLine[];
  }): Promise<DyResult>;

  reportAddToWishlist(args: {
    eventName: string;
    productId: string;
  }): Promise<DyResult>;

  reportKeywordSearch(args: {
    eventName: string;
    keywords: string;
  }): Promise<DyResult>;

  reportLogin(args: {
    eventName: string;
    cuidType: string;
    cuid: string;
  }): Promise<DyResult>;

  reportCustomEvent(args: {
    eventName: string;
    properties: Record<string, DyEventValue>;
  }): Promise<DyResult>;

  // ---- Engagement -----------------------------------------------------------

  /** Click sobre un slot concreto de una campaña de recomendaciones. */
  reportSlotClick(args: {
    variationId?: number;
    slotId: string;
  }): Promise<DyResult>;

  /** Click sobre una decisión sin slot (campañas de contenido). */
  reportClick(args: {
    decisionId: string;
    variationId?: number;
  }): Promise<DyResult>;

  reportSlotsImpression(args: {
    variationId?: number;
    slotIds: string[];
  }): Promise<DyResult>;

  // ---- Shopping Muse --------------------------------------------------------

  chatWithAssistant(args: {
    page: DyPage;
    text: string;
    /** Se reenvía para mantener el contexto de la conversación. */
    chatId?: string;
    /** `false` trae el producto completo del feed, no solo el SKU. */
    skusOnly: boolean;
  }): Promise<DyAssistantResult>;

  // ---- Experience Search ----------------------------------------------------

  semanticSearch(args: {
    page: DyPage;
    text: string;
    filters?: DySearchFilter[];
    numItems: number;
    offset: number;
    enableSpellCheck: boolean;
  }): Promise<DySearchResult>;

  /** Búsqueda visual. La imagen va en base64 **sin** el prefijo `data:`. */
  visualSearch(args: {
    page: DyPage;
    imageBase64: string;
  }): Promise<DySearchResult>;
}
