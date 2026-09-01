/**
 * Adaptador sobre `@dynamicyield/react-native-sdk`.
 *
 * Es el único fichero que conoce el SDK: el resto de la app habla con la
 * interfaz `DyClient`. Requiere un build nativo — el SDK es un TurboModule, así
 * que no existe en Node ni en Jest, y por eso `createClient` comprueba antes de
 * cargarlo.
 *
 * ⚠️ Este fichero **no se ha podido compilar todavía**: `@dynamicyield/react-native-sdk`
 * se distribuye por GitHub Packages y hace falta un PAT clásico con
 * `read:packages` para instalarlo. Hasta entonces `tsc` no lo verifica contra
 * los tipos reales. Las llamadas de pageviews, choose, eventos de carrito y
 * engagement por decisión están calcadas de código que sí compiló contra el
 * SDK; las de Assistant, Search, engagement por slot y los eventos de wishlist,
 * búsqueda y login están portadas del SDK de iOS y son las que hay que
 * contrastar primero al instalar el paquete.
 */

import {
  boolVal,
  choose,
  engagements,
  events,
  getDyId,
  getSessionId,
  initialize,
  isInitialize,
  numVal,
  pageViews,
  resetUserIdAndSessionId,
  setActiveConsentAccepted,
  strVal,
  assistant,
  search,
  ChoiceType,
  CurrencyType,
  DataCenter,
  Page,
  ResultStatus,
  type Choice,
  type PageAttribute,
  type DYResult,
  type Variation,
} from '@dynamicyield/react-native-sdk';

import type { DyClient } from './DyClient';
import type {
  DyAssistantResult,
  DyPageAttributes,
  DyChoice,
  DyChooseRequest,
  DyChooseResult,
  DyConfig,
  DyEventValue,
  DyPage,
  DyResult,
  DySearchFilter,
  DySearchResult,
  DyVariation,
} from './types';

/**
 * El SDK **no lanza**: devuelve un `DYResult` con `status`. Ignorar ese campo
 * haría que los fallos pasaran desapercibidos, así que se convierten en un
 * estado explícito que `DyService` ya sabe interpretar.
 */
const toResult = (result: DYResult): DyResult => ({
  status: result.status === ResultStatus.ERROR ? 'error' : 'success',
});

/** Construye el `Page` del SDK desde el contexto de pantalla. */
const toPage = (page: DyPage, locale: string): Page => {
  const location = page.location;
  switch (page.type) {
    case 'HOMEPAGE':
      return Page.homePage({ location, locale });
    case 'PRODUCT':
      return Page.productPage({ location, sku: page.data[0] ?? '', locale });
    case 'CATEGORY':
      return Page.categoryPage({ location, categories: page.data, locale });
    case 'CART':
      return Page.cartPage({ location, items: page.data, locale });
    case 'OTHER':
      return Page.otherPage({ location, locale });
  }
};

/**
 * Las variaciones del SDK son instancias de clase con métodos: al guardarlas en
 * el estado de React perderían el prototipo. Se aplanan a datos puros, que es
 * todo lo que necesita el parseo.
 */
const toVariation = (variation: Variation): DyVariation => ({
  id: variation.id,
  decisionId:
    (variation as { decisionId?: string | number }).decisionId === undefined
      ? undefined
      : String((variation as { decisionId?: string | number }).decisionId),
  payload: variation.payload as DyVariation['payload'],
});

const toChoice = (choice: Choice): DyChoice => ({
  name: choice.name,
  variations: (choice.variations ?? []).map(toVariation),
});

/**
 * Los custom attributes van en un `Map`, no en un objeto plano, y cada valor
 * envuelto en `{ value }`. A diferencia del SDK de iOS, `PageAttribute` aquí es
 * un tipo, no una clase: no se construye con `new`.
 */
const toPageAttributes = (
  attributes: DyPageAttributes | undefined,
): Map<string, PageAttribute> | undefined =>
  attributes
    ? new Map(
        Object.entries(attributes).map(([key, value]) => [key, { value }]),
      )
    : undefined;

/** `CurrencyType` es un enum cerrado; una divisa desconocida se omite. */
const toCurrency = (currency: string): CurrencyType | undefined =>
  (Object.values(CurrencyType) as string[]).includes(currency)
    ? (currency as CurrencyType)
    : undefined;

/** Los mapas de eventos custom van con los constructores del SDK. */
const toEventValue = (value: DyEventValue) => {
  switch (value.kind) {
    case 'string':
      return strVal(value.value);
    case 'number':
      return numVal(value.value);
    case 'boolean':
      return boolVal(value.value);
  }
};

export const createNativeClient = (): DyClient => {
  let locale = 'en_US';

  const guard = (method: string): void => {
    if (!isInitialize()) {
      throw new Error(
        `DyClient.${method} llamado antes de initialize(). Envuelve la app en <DyProvider>.`,
      );
    }
  };

  return {
    async initialize(config: DyConfig): Promise<void> {
      locale = config.locale;

      const ok = await initialize({
        apiKey: config.apiKey,
        dataCenter: config.dataCenter === 'EU' ? DataCenter.EU : DataCenter.US,
        locale: config.locale,
        // Sin `activeConsentIntegration` el SDK se comporta siempre como si el
        // consentimiento estuviera concedido, ignorando el flag de abajo.
        activeConsentIntegration: true,
        activeConsentAccepted: config.activeConsentAccepted,
        // La app reporta pageviews e impresiones explícitamente, para que la
        // secuencia se vea en el informe de actividad.
        isImplicitPageview: false,
        isImplicitImpressionMode: false,
      });

      if (!ok) {
        throw new Error(
          'DY initialize() devolvió false. Revisa la API key y el data center en src/config/dyKeys.ts.',
        );
      }
    },

    async getDyId(): Promise<string> {
      return getDyId() ?? '';
    },

    async getSessionId(): Promise<string> {
      return getSessionId() ?? '';
    },

    async resetUserIdAndSessionId(): Promise<void> {
      guard('resetUserIdAndSessionId');
      await resetUserIdAndSessionId();
    },

    async setActiveConsentAccepted(accepted: boolean): Promise<void> {
      guard('setActiveConsentAccepted');
      await setActiveConsentAccepted(accepted);
    },

    // ---- Pageviews ----------------------------------------------------------

    async reportHomePageView(location: string): Promise<DyResult> {
      guard('reportHomePageView');
      return toResult(
        await pageViews.reportHomePageView({
          pageLocation: location,
          pageLocale: locale,
        }),
      );
    },

    async reportCategoryPageView(
      location: string,
      categories: string[],
    ): Promise<DyResult> {
      guard('reportCategoryPageView');
      return toResult(
        await pageViews.reportCategoryPageView({
          pageLocation: location,
          categories,
          pageLocale: locale,
        }),
      );
    },

    async reportProductPageView(
      location: string,
      sku: string,
    ): Promise<DyResult> {
      guard('reportProductPageView');
      return toResult(
        await pageViews.reportProductPageView({
          pageLocation: location,
          sku,
          pageLocale: locale,
        }),
      );
    },

    async reportCartPageView(
      location: string,
      cart: string[],
    ): Promise<DyResult> {
      guard('reportCartPageView');
      return toResult(
        await pageViews.reportCartPageView({
          pageLocation: location,
          cart,
          pageLocale: locale,
        }),
      );
    },

    async reportOtherPageView(
      location: string,
      data: string,
    ): Promise<DyResult> {
      guard('reportOtherPageView');
      return toResult(
        await pageViews.reportOtherPageView({
          pageLocation: location,
          data,
          pageLocale: locale,
        }),
      );
    },

    // ---- Choose -------------------------------------------------------------

    async chooseVariations(request: DyChooseRequest): Promise<DyChooseResult> {
      guard('chooseVariations');

      const result = await choose.chooseVariations({
        selectorNames: request.selectorNames,
        page: toPage(request.page, locale),
        pageAttributes: toPageAttributes(request.pageAttributes),
        cuid: request.identity?.cuid,
        cuidType: request.identity?.cuidType,
        // Con `skusOnly: false` DY devuelve el producto completo del feed
        // (nombre, precio, image_url, marca) y la app no necesita catálogo.
        recsProductData: { skusOnly: false },
      });

      if (result.status === ResultStatus.ERROR) {
        return { status: 'error' };
      }

      // NO_DECISION no es un error: el usuario no entra en la campaña (grupo de
      // control o segmentación). Se descarta en silencio.
      const choices = (result.choices ?? [])
        .filter(choice => choice.type !== ChoiceType.NoDecision)
        .map(toChoice);

      return { status: 'success', choices };
    },

    // ---- Eventos ------------------------------------------------------------

    async reportAddToCart(args): Promise<DyResult> {
      guard('reportAddToCart');
      return toResult(
        await events.reportAddToCartEvent({
          name: args.eventName,
          value: args.value,
          currency: toCurrency(args.currency),
          productId: args.productId,
          quantity: args.quantity,
          cart: args.cart,
        }),
      );
    },

    async reportRemoveFromCart(args): Promise<DyResult> {
      guard('reportRemoveFromCart');
      return toResult(
        await events.reportRemoveFromCartEvent({
          name: args.eventName,
          value: args.value,
          currency: toCurrency(args.currency),
          productId: args.productId,
          quantity: args.quantity,
          cart: args.cart,
        }),
      );
    },

    async reportSyncCart(args): Promise<DyResult> {
      guard('reportSyncCart');
      return toResult(
        await events.reportSyncCartEvent({
          name: args.eventName,
          value: args.value,
          currency: toCurrency(args.currency),
          cart: args.cart,
        }),
      );
    },

    async reportPurchase(args): Promise<DyResult> {
      guard('reportPurchase');
      return toResult(
        await events.reportPurchaseEvent({
          name: args.eventName,
          value: args.value,
          currency: toCurrency(args.currency),
          uniqueTransactionId: args.uniqueTransactionId,
          cart: args.cart,
        }),
      );
    },

    async reportAddToWishlist(args): Promise<DyResult> {
      guard('reportAddToWishlist');
      return toResult(
        await events.reportAddToWishListEvent({
          name: args.eventName,
          productId: args.productId,
          size: args.size,
        }),
      );
    },

    async reportKeywordSearch(args): Promise<DyResult> {
      guard('reportKeywordSearch');
      return toResult(
        await events.reportKeywordSearchEvent({
          name: args.eventName,
          keywords: args.keywords,
        }),
      );
    },

    async reportLogin(args): Promise<DyResult> {
      guard('reportLogin');
      return toResult(
        await events.reportLoginEvent({
          name: args.eventName,
          cuidType: args.cuidType,
          cuid: args.cuid,
        }),
      );
    },

    async reportCustomEvent(args): Promise<DyResult> {
      guard('reportCustomEvent');
      // El SDK espera un Map, no un objeto plano, y el método es singular.
      const map = new Map(
        Object.entries(args.properties).map(([key, value]) => [
          key,
          toEventValue(value),
        ]),
      );
      return toResult(
        await events.reportCustomEvent({ name: args.eventName, map }),
      );
    },

    // ---- Engagement ---------------------------------------------------------

    async reportSlotClick(args): Promise<DyResult> {
      guard('reportSlotClick');
      return toResult(
        await engagements.reportSlotClick({
          variation: args.variationId,
          slotId: args.slotId,
        }),
      );
    },

    async reportClick(args): Promise<DyResult> {
      guard('reportClick');
      // reportClick acepta **una** variación, no un array.
      return toResult(
        await engagements.reportClick({
          decisionId: args.decisionId,
          variation: args.variationId,
        }),
      );
    },

    async reportSlotsImpression(args): Promise<DyResult> {
      guard('reportSlotsImpression');
      return toResult(
        await engagements.reportSlotsImpression({
          variation: args.variationId,
          slotsIds: args.slotIds,
        }),
      );
    },

    // ---- Shopping Muse ------------------------------------------------------

    async chatWithAssistant(args): Promise<DyAssistantResult> {
      guard('chatWithAssistant');
      const result = await assistant.chatWithAssistant({
        page: toPage(args.page, locale),
        text: args.text,
        chatId: args.chatId,
        options: { productData: { skusOnly: args.skusOnly } },
      });
      return {
        status: result.status === ResultStatus.ERROR ? 'error' : 'success',
        choices: result.choices as DyAssistantResult['choices'],
      };
    },

    // ---- Experience Search --------------------------------------------------

    async semanticSearch(args): Promise<DySearchResult> {
      guard('semanticSearch');
      const result = await search.semanticSearch({
        page: toPage(args.page, locale),
        text: args.text,
        filters: args.filters as DySearchFilter[] | undefined,
        pagination: { numItems: args.numItems, offset: args.offset },
        enableSpellCheck: args.enableSpellCheck,
      });
      return {
        status: result.status === ResultStatus.ERROR ? 'error' : 'success',
        choice: result.choice as DySearchResult['choice'],
      };
    },

    async visualSearch(args): Promise<DySearchResult> {
      guard('visualSearch');
      const result = await search.visualSearch({
        page: toPage(args.page, locale),
        // base64 **sin** el prefijo `data:`.
        imageBase64: args.imageBase64,
      });
      return {
        status: result.status === ResultStatus.ERROR ? 'error' : 'success',
        choice: result.choice as DySearchResult['choice'],
      };
    },
  };
};
