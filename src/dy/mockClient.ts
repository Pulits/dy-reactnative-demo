import { CATALOG } from '../catalog';
import type {
  DyClient,
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
} from './types';

/**
 * Implementación de `DyClient` que no habla con Dynamic Yield.
 *
 * Se usa cuando el TurboModule del SDK no está disponible (tests, Metro sin
 * build nativo) o cuando no hay API key configurada. Las decisiones son
 * deterministas, no personalizadas: aquí no hay motor de recomendación, solo
 * el contrato. La secuencia de llamadas sí es idéntica a la del adaptador real.
 */

const SELECTOR_HOME_RECS = 'RN Demo — Home Recs';
const SELECTOR_PDP_RECS = 'RN Demo — PDP Similar Items';
const SELECTOR_HOME_BANNER = 'RN Demo — Home Banner';

let logSeq = 0;
let variationSeq = 1000;

const randomId = (prefix: string): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

/** Rota el catálogo a partir de una semilla para que cada contexto dé un set distinto. */
const pickSkus = (seed: string, count: number, exclude?: string): string[] => {
  const pool = CATALOG.filter(product => product.sku !== exclude);
  const offset =
    Math.abs(
      Array.from(seed).reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7),
    ) % Math.max(pool.length, 1);

  return Array.from({ length: Math.min(count, pool.length) }, (_, index) => {
    return pool[(offset + index) % pool.length].sku;
  });
};

export const createMockDyClient = (): ObservableDyClient => {
  let config: DyConfig | null = null;
  let consentGranted = true;
  let identity: DyIdentity = { dyid: null, sessionId: null };
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
    if (!config) {
      throw new Error(
        `DyClient.${method} llamado antes de init(). Envuelve la app en <DyProvider>.`,
      );
    }
  };

  const buildChoice = (
    selector: string,
    context: DyPageContext,
  ): DyChoice | null => {
    const decisionId = randomId('dec');

    if (selector === SELECTOR_HOME_BANNER) {
      return {
        id: randomId('cmp'),
        name: selector,
        type: 'DECISION',
        decisionId,
        variations: [
          {
            id: ++variationSeq,
            payload: {
              type: 'CUSTOM_JSON',
              // El SDK entrega los CUSTOM_JSON como cadena; se replica aquí para
              // que `asBannerPayload` reciba lo mismo en ambos adaptadores.
              data: JSON.stringify({
                title: 'Envío gratis en pedidos +60 €',
                body: 'Recíbelo en 24-48 h en península. Devoluciones sin coste durante 30 días.',
                cta: 'Ver condiciones',
              }),
            },
          },
        ],
      };
    }

    if (selector === SELECTOR_HOME_RECS || selector === SELECTOR_PDP_RECS) {
      // En PRODUCT, `context.data[0]` es el SKU visitado: se excluye de sus propios similares.
      const currentSku =
        context.type === 'PRODUCT' ? context.data[0] : undefined;
      const seed = `${selector}|${context.type}|${context.data.join(',')}`;
      const skus = pickSkus(seed, 4, currentSku);

      return {
        id: randomId('cmp'),
        name: selector,
        type: 'RECS_DECISION',
        decisionId,
        variations: [
          {
            id: ++variationSeq,
            payload: {
              type: 'RECS',
              data: {
                slots: skus.map(sku => ({ sku, slotId: randomId('slot') })),
              },
            },
          },
        ],
      };
    }

    return null;
  };

  const client: DyClient = {
    async init(nextConfig) {
      config = nextConfig;
      consentGranted = nextConfig.consent.granted;
      identity = { dyid: randomId('dyid'), sessionId: randomId('sess') };
      emit('init', `SDK simulado inicializado (${nextConfig.dataCenter})`, {
        dataCenter: nextConfig.dataCenter,
        consent: consentGranted,
        identity,
      });
    },

    async setConsent(granted) {
      requireInit('setConsent');
      consentGranted = granted;
      emit(
        'consent',
        granted ? 'Consentimiento concedido' : 'Consentimiento denegado',
        { granted },
      );
    },

    getIdentity() {
      return identity;
    },

    async pageView(context) {
      requireInit('pageView');
      emit('pageview', `Pageview ${context.type}`, context);
    },

    async choose(request: DyChooseRequest): Promise<DyChooseResult> {
      requireInit('choose');

      if (request.implicitPageview) {
        emit(
          'pageview',
          `Pageview ${request.context.type} (implícito)`,
          request.context,
        );
      }

      const choices = request.selectors
        .map(selector => buildChoice(selector, request.context))
        .filter((choice): choice is DyChoice => choice !== null);

      emit(
        'choose',
        `choose(${request.selectors.length}) -> ${choices.length} campaña(s)`,
        {
          selectors: request.selectors,
          context: request.context,
          // Sin consentimiento DY sigue sirviendo campañas, pero no personalizadas.
          personalized: consentGranted,
          decisionIds: choices.map(choice => choice.decisionId),
        },
      );

      return { choices };
    },

    async reportEngagement(engagement: DyEngagement) {
      requireInit('reportEngagement');
      emit(
        'engagement',
        `${engagement.type} sobre ${engagement.variationIds.length} variación(es)`,
        engagement,
      );
    },

    async trackEvent(event: DyEvent) {
      requireInit('trackEvent');
      emit('event', `${event.name} (${event.kind})`, event);
    },

    async getRolloutFlag(selector: string): Promise<DyRolloutFlag> {
      requireInit('getRolloutFlag');
      // Determinista por selector para que la demo sea reproducible.
      const flag = selector.length % 2 === 0;
      emit('choose', `Rollout "${selector}" -> ${flag}`, { selector, flag });
      return flag;
    },
  };

  return {
    ...client,
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

export const SELECTORS = {
  homeRecs: SELECTOR_HOME_RECS,
  pdpRecs: SELECTOR_PDP_RECS,
  homeBanner: SELECTOR_HOME_BANNER,
} as const;
