import {
  boolVal,
  choose,
  engagements,
  events,
  initialize,
  isInitialize,
  getDyId,
  getSessionId,
  numVal,
  pageViews,
  setActiveConsentAccepted,
  strVal,
  ChoiceType,
  CurrencyType,
  DataCenter,
  Page,
  ResultStatus,
  type Choice,
  type DYResult,
  type Variation,
} from '@dynamicyield/react-native-sdk';

import type {
  DyLogEntry,
  DyLogListener,
  ObservableDyClient,
} from './DyClient';
import type {
  DyChooseRequest,
  DyChooseResult,
  DyChoice,
  DyConfig,
  DyEngagement,
  DyEvent,
  DyIdentity,
  DyPageContext,
  DyRolloutFlag,
  DyVariation,
} from './types';

/**
 * Adaptador sobre `@dynamicyield/react-native-sdk` v1.5.0.
 *
 * Traduce el contrato `DyClient` a las llamadas reales del SDK. Solo este
 * fichero conoce el SDK: pantallas y hooks siguen hablando con la interfaz.
 *
 * Requiere un build nativo (el SDK es un TurboModule, no funciona en Node ni en
 * los tests de Jest), por eso `createMockDyClient` sigue existiendo.
 */

let logSeq = 0;

/**
 * El SDK no lanza excepciones: devuelve un `DYResult` con `status`. Ignorar ese
 * campo haría que los fallos pasaran desapercibidos, así que se convierten en
 * errores explícitos.
 */
const assertOk = (result: DYResult, operation: string): DYResult => {
  if (result.status === ResultStatus.ERROR) {
    const detail = result.error?.message ?? 'sin detalle';
    throw new Error(`DY ${operation} falló: ${detail}`);
  }
  return result;
};

/** Construye el `Page` del SDK a partir del contexto de pantalla. */
const toPage = (context: DyPageContext): Page => {
  const { location, locale } = context;

  switch (context.type) {
    case 'HOMEPAGE':
      return Page.homePage({ location, locale });
    case 'PRODUCT':
      return Page.productPage({ location, sku: context.data[0] ?? '', locale });
    case 'CATEGORY':
      return Page.categoryPage({ location, categories: context.data, locale });
    case 'CART':
      return Page.cartPage({ location, items: context.data, locale });
    case 'OTHER':
      return Page.otherPage({ location, locale });
  }
};

/**
 * Las variaciones del SDK son instancias de clase con métodos: al pasarlas al
 * estado de React se convertirían en objetos planos y perderían el prototipo.
 * Aquí se aplanan a datos puros y el engagement se reporta vía `engagements`,
 * que solo necesita `decisionId` y los ids numéricos.
 */
const toVariation = (variation: Variation): DyVariation => ({
  id: variation.id,
  payload: {
    type: String(variation.payload?.type ?? ''),
    data: (variation.payload as { data?: unknown }).data,
  },
  rolloutFlag: (variation as { rolloutFlag?: boolean }).rolloutFlag,
});

const toChoice = (choice: Choice): DyChoice => ({
  id: choice.id,
  name: choice.name,
  type: String(choice.type),
  variations: (choice.variations ?? []).map(toVariation),
  decisionId:
    choice.decisionId === undefined ? undefined : String(choice.decisionId),
});

/** `CurrencyType` es un enum cerrado; una divisa desconocida se omite. */
const toCurrency = (currency: string): CurrencyType | undefined =>
  (Object.values(CurrencyType) as string[]).includes(currency)
    ? (currency as CurrencyType)
    : undefined;

export const createNativeDyClient = (): ObservableDyClient => {
  let config: DyConfig | null = null;
  let log: DyLogEntry[] = [];
  let listeners: DyLogListener[] = [];

  const emit = (
    kind: DyLogEntry['kind'],
    summary: string,
    detail: unknown,
  ): void => {
    log = [
      ...log,
      { id: ++logSeq, at: Date.now(), kind, summary, detail },
    ].slice(-60);

    if (config?.debug) {
      console.log(`[dy] ${kind}: ${summary}`, detail);
    }
    listeners.forEach(listener => listener(log));
  };

  const requireInit = (method: string): void => {
    if (!isInitialize()) {
      throw new Error(
        `DyClient.${method} llamado antes de init(). Envuelve la app en <DyProvider>.`,
      );
    }
  };

  return {
    async init(nextConfig: DyConfig) {
      config = nextConfig;

      const ok = await initialize({
        apiKey: nextConfig.apiKey,
        dataCenter:
          nextConfig.dataCenter === 'EU' ? DataCenter.EU : DataCenter.US,
        locale: nextConfig.locale,
        // Con `activeConsentIntegration` el SDK respeta el consentimiento que le
        // pasamos; sin él se comporta siempre como si estuviera concedido.
        activeConsentIntegration: true,
        activeConsentAccepted: nextConfig.consent.granted,
        // Pageviews e impresiones se reportan explícitamente desde la app, para
        // que la secuencia sea visible en el panel de actividad.
        isImplicitPageview: false,
        isImplicitImpressionMode: false,
      });

      if (!ok) {
        throw new Error(
          'DY initialize() devolvió false. Revisa la API key y el data center en src/dy/dyConfig.ts.',
        );
      }

      emit('init', `SDK inicializado (${nextConfig.dataCenter})`, {
        dataCenter: nextConfig.dataCenter,
        consent: nextConfig.consent.granted,
        dyid: getDyId(),
        sessionId: getSessionId(),
      });
    },

    async setConsent(granted: boolean) {
      requireInit('setConsent');
      await setActiveConsentAccepted(granted);
      emit(
        'consent',
        granted ? 'Consentimiento concedido' : 'Consentimiento denegado',
        { granted },
      );
    },

    getIdentity(): DyIdentity {
      return { dyid: getDyId(), sessionId: getSessionId() };
    },

    async pageView(context: DyPageContext) {
      requireInit('pageView');
      const { location, locale } = context;

      switch (context.type) {
        case 'HOMEPAGE':
          assertOk(
            await pageViews.reportHomePageView({
              pageLocation: location,
              pageLocale: locale,
            }),
            'reportHomePageView',
          );
          break;
        case 'PRODUCT':
          assertOk(
            await pageViews.reportProductPageView({
              pageLocation: location,
              sku: context.data[0] ?? '',
              pageLocale: locale,
            }),
            'reportProductPageView',
          );
          break;
        case 'CATEGORY':
          assertOk(
            await pageViews.reportCategoryPageView({
              pageLocation: location,
              categories: context.data,
              pageLocale: locale,
            }),
            'reportCategoryPageView',
          );
          break;
        case 'CART':
          assertOk(
            await pageViews.reportCartPageView({
              pageLocation: location,
              cart: context.data,
              pageLocale: locale,
            }),
            'reportCartPageView',
          );
          break;
        case 'OTHER':
          assertOk(
            await pageViews.reportOtherPageView({
              pageLocation: location,
              data: context.data.join(','),
              pageLocale: locale,
            }),
            'reportOtherPageView',
          );
          break;
      }

      emit('pageview', `Pageview ${context.type}`, context);
    },

    async choose(request: DyChooseRequest): Promise<DyChooseResult> {
      requireInit('choose');

      const result = await choose.chooseVariations({
        selectorNames: request.selectors,
        page: toPage(request.context),
        options: {
          isImplicitPageview: request.implicitPageview ?? false,
          isImplicitImpressionMode: false,
        },
      });
      assertOk(result, 'chooseVariations');

      // NO_DECISION significa que el usuario no entra en la campaña (grupo de
      // control, o no cumple la segmentación). No es un error: se descarta.
      const choices = (result.choices ?? [])
        .filter(choice => choice.type !== ChoiceType.NoDecision)
        .map(toChoice);

      emit(
        'choose',
        `choose(${request.selectors.length}) -> ${choices.length} campaña(s)`,
        {
          selectors: request.selectors,
          context: request.context,
          status: result.status,
          warnings: result.warnings,
          decisionIds: choices.map(choice => choice.decisionId),
        },
      );

      return { choices };
    },

    async reportEngagement(engagement: DyEngagement) {
      requireInit('reportEngagement');

      if (engagement.type === 'IMPRESSION') {
        assertOk(
          await engagements.reportImpression({
            decisionId: engagement.decisionId,
            variations: engagement.variationIds,
          }),
          'reportImpression',
        );
      } else {
        // reportClick acepta una sola variación, no un array.
        assertOk(
          await engagements.reportClick({
            decisionId: engagement.decisionId,
            variation: engagement.variationIds[0],
          }),
          'reportClick',
        );
      }

      emit(
        'engagement',
        `${engagement.type} sobre ${engagement.variationIds.length} variación(es)`,
        engagement,
      );
    },

    async trackEvent(event: DyEvent) {
      requireInit('trackEvent');

      switch (event.kind) {
        case 'addToCart':
          assertOk(
            await events.reportAddToCartEvent({
              name: event.name,
              value: event.value,
              productId: event.productId,
              quantity: event.quantity,
              currency: toCurrency(event.currency),
              cart: event.cart,
            }),
            'reportAddToCartEvent',
          );
          break;
        case 'purchase':
          assertOk(
            await events.reportPurchaseEvent({
              name: event.name,
              value: event.value,
              cart: event.cart,
              currency: toCurrency(event.currency),
              uniqueTransactionId: event.uniqueTransactionId,
            }),
            'reportPurchaseEvent',
          );
          break;
        case 'custom': {
          // El SDK exige un Map de valores etiquetados, no un objeto plano.
          const map = new Map(
            Object.entries(event.properties).map(([key, value]) => {
              if (typeof value === 'number') {
                return [key, numVal(value)] as const;
              }
              if (typeof value === 'boolean') {
                return [key, boolVal(value)] as const;
              }
              return [key, strVal(value)] as const;
            }),
          );
          assertOk(
            await events.reportCustomEvent({ name: event.name, map }),
            'reportCustomEvent',
          );
          break;
        }
      }

      emit('event', `${event.name} (${event.kind})`, event);
    },

    async getRolloutFlag(selector: string): Promise<DyRolloutFlag> {
      requireInit('getRolloutFlag');

      const result = await choose.chooseVariations({
        selectorNames: [selector],
        page: Page.otherPage({ location: 'dydemo://rollout' }),
      });
      assertOk(result, 'chooseVariations (rollout)');

      // Sin variación asignada, el usuario no entra en el rollout.
      const variation = result.choices?.[0]?.variations?.[0];
      const flag = (variation as { rolloutFlag?: boolean } | undefined)
        ?.rolloutFlag;

      emit('choose', `Rollout "${selector}" -> ${flag ?? 'sin flag'}`, {
        selector,
        flag: flag ?? null,
      });

      return flag ?? null;
    },

    getLog: () => log,
    clearLog: () => {
      log = [];
      listeners.forEach(listener => listener(log));
    },
    subscribe: (listener: DyLogListener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter(current => current !== listener);
      };
    },
  };
};
