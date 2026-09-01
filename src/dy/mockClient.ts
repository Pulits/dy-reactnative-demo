/**
 * Adaptador simulado.
 *
 * Devuelve respuestas con la **misma forma** que el SDK real —mismos nombres de
 * campo, `custom` como cadena JSON sin parsear, ids de variación numéricos— para
 * que `DyService` corra exactamente el mismo código en ambos casos. Si el mock
 * "arreglara" la forma, los tests dejarían de cubrir el parseo de verdad.
 *
 * Los productos salen del catálogo local; los selectores son los mismos nombres
 * que en la sección real.
 */

import { appConfig } from '../config/appConfig';
import { CATALOG } from '../catalog';
import type { Product } from '../models';
import type { DyClient } from './DyClient';
import type {
  DyAssistantResult,
  DyChooseRequest,
  DyChooseResult,
  DyConfig,
  DyPage,
  DyResult,
  DySearchResult,
  DySlot,
} from './types';

const OK: DyResult = { status: 'success' };

/** Un slot con la forma exacta que devuelve el feed. */
const slotOf = (product: Product, index: number): DySlot => ({
  slotId: `slot-${product.id}-${index}`,
  productData: {
    groupId: product.id,
    name: product.name,
    // El feed puede mandar el precio como cadena; se alterna para ejercitarlo.
    price: index % 2 === 0 ? product.price : String(product.price),
    imageUrl: product.imageUrl,
    categories: [product.category],
    inStock: product.inStock,
    extra: {
      sku: product.sku,
      description: product.description ?? '',
      'type:number:rating': product.rating ?? 4.5,
      'type:number:reviews': product.reviewCount ?? 128,
      details: product.description ?? '',
      size_and_fit: 'True to size. Model is 1.80 m and wears size M.',
      delivery_and_returns: 'Free delivery over $50. Returns within 30 days.',
      material: '100% cotton.',
    },
  },
});

const recsChoice = (
  name: string,
  products: Product[],
  custom: Record<string, string>,
  variationId: number,
): DyChooseResult => ({
  status: 'success',
  choices: [
    {
      name,
      variations: [
        {
          id: variationId,
          decisionId: `decision-${name.replace(/\s+/g, '-').toLowerCase()}`,
          payload: {
            type: 'RECS',
            data: {
              slots: products.map(slotOf),
              // Sin parsear, igual que el SDK.
              custom: JSON.stringify(custom),
            },
          },
        },
      ],
    },
  ],
});

const customJsonChoice = (
  name: string,
  payload: Record<string, unknown>,
  variationId: number,
): DyChooseResult => ({
  status: 'success',
  choices: [
    {
      name,
      variations: [
        {
          id: variationId,
          decisionId: `decision-${name.replace(/\s+/g, '-').toLowerCase()}`,
          // El SDK entrega CUSTOM_JSON como cadena, no como objeto.
          payload: { type: 'CUSTOM_JSON', data: JSON.stringify(payload) },
        },
      ],
    },
  ],
});

/** Sin campaña: el usuario no entra (control o segmentación). No es un error. */
const NO_DECISION: DyChooseResult = { status: 'success', choices: [] };

const byCategory = (category: string): Product[] =>
  CATALOG.filter(p => p.category === category);

const pick = (products: Product[], count: number): Product[] =>
  products.slice(0, count);

export const createMockClient = (): DyClient => {
  let dyid = '';
  let sessionId = '';
  let initialized = false;

  const newId = (prefix: string): string =>
    `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

  const chooseVariations = async (
    request: DyChooseRequest,
  ): Promise<DyChooseResult> => {
    // El primer Choose es el que hace que DY asigne dyid y sesión.
    if (!dyid) {
      dyid = newId('dyid');
      sessionId = newId('session');
    }

    const selector = request.selectorNames[0];
    const S = appConfig.selectors;

    switch (selector) {
      case S.homeRecs:
        return recsChoice(
          selector,
          pick(CATALOG, 8),
          {
            title: 'Recommended for you',
            subtitle: 'Picked from your activity',
          },
          101,
        );

      case S.pdpRecs:
        return recsChoice(
          selector,
          pick(CATALOG, 6),
          { title: 'You may also like' },
          102,
        );

      case S.cartRecs:
        return recsChoice(
          selector,
          pick(CATALOG, 6),
          { title: 'Complete your order' },
          103,
        );

      case S.searchOverlayRecs:
        return recsChoice(
          selector,
          pick(CATALOG, 4),
          { title: 'Most popular' },
          104,
        );

      case S.singleProduct:
        return recsChoice(selector, pick(CATALOG, 1), {}, 105);

      case S.mostPopularInCategory:
      case S.mostAffinityInCategory: {
        const category = request.page.data[0] ?? '';
        return recsChoice(
          selector,
          pick(byCategory(category), 6),
          {
            title:
              selector === S.mostAffinityInCategory
                ? 'Best for you'
                : `Most popular in ${category}`,
          },
          selector === S.mostAffinityInCategory ? 107 : 106,
        );
      }

      case S.museHome:
        return recsChoice(
          selector,
          pick(CATALOG, 8),
          {
            musename: 'Blueberry Muse',
            searchplaceholder: 'What are you looking for?',
            suggestedsearch1: 'Date night look',
            suggestedsearch2: 'Trending handbags',
            suggestedsearch3: 'Spring style event',
            suggestedsearch4: 'Sleek and chic',
          },
          108,
        );

      case S.heroBanner:
        return customJsonChoice(
          selector,
          {
            image: 'https://picsum.photos/seed/blueberry-hero/1200/800',
            maintext: 'New Season Collection',
            subtext: 'Discover the latest trends and exclusive styles',
            buttonCta: 'Shop Women',
            category: 'Women',
            fontcolor: '#ffffff',
          },
          201,
        );

      case S.socialProof:
        return customJsonChoice(
          selector,
          {
            highlightedtext: 'Going fast!',
            text: 'people bought this item last week',
            // Aquí llega como número: el parseo tiene que aguantar ambos.
            performance: 47,
          },
          202,
        );

      default: {
        const bannerIndex = S.homeBanners.indexOf(
          selector as (typeof S.homeBanners)[number],
        );
        if (bannerIndex >= 0) {
          const category = ['Women', 'Men', 'Kids', 'Beauty'][bannerIndex];
          return customJsonChoice(
            selector,
            {
              image: `https://picsum.photos/seed/blueberry-banner-${bannerIndex}/800/600`,
              title: `${category} edit`,
              subtitle: 'Curated for the season',
              category,
            },
            210 + bannerIndex,
          );
        }
        return NO_DECISION;
      }
    }
  };

  const assistantSlots = (products: Product[]): DySlot[] =>
    products.map(slotOf);

  return {
    async initialize(_config: DyConfig): Promise<void> {
      initialized = true;
    },

    async getDyId(): Promise<string> {
      return dyid;
    },

    async getSessionId(): Promise<string> {
      return sessionId;
    },

    async resetUserIdAndSessionId(): Promise<void> {
      // Igual que el SDK: se borran, y el siguiente Choose asigna los nuevos.
      dyid = '';
      sessionId = '';
    },

    async setActiveConsentAccepted(_accepted: boolean): Promise<void> {},

    async reportHomePageView(_location: string): Promise<DyResult> {
      return initialized ? OK : { status: 'error' };
    },
    async reportCategoryPageView(): Promise<DyResult> {
      return OK;
    },
    async reportProductPageView(): Promise<DyResult> {
      return OK;
    },
    async reportCartPageView(): Promise<DyResult> {
      return OK;
    },
    async reportOtherPageView(): Promise<DyResult> {
      return OK;
    },

    chooseVariations,

    async reportAddToCart(): Promise<DyResult> {
      return OK;
    },
    async reportRemoveFromCart(): Promise<DyResult> {
      return OK;
    },
    async reportSyncCart(): Promise<DyResult> {
      return OK;
    },
    async reportPurchase(): Promise<DyResult> {
      return OK;
    },
    async reportAddToWishlist(): Promise<DyResult> {
      return OK;
    },
    async reportKeywordSearch(): Promise<DyResult> {
      return OK;
    },
    async reportLogin(): Promise<DyResult> {
      return OK;
    },
    async reportCustomEvent(): Promise<DyResult> {
      return OK;
    },

    async reportSlotClick(): Promise<DyResult> {
      return OK;
    },
    async reportClick(): Promise<DyResult> {
      return OK;
    },
    async reportSlotsImpression(): Promise<DyResult> {
      return OK;
    },

    async chatWithAssistant(args: {
      page: DyPage;
      text: string;
      chatId?: string;
    }): Promise<DyAssistantResult> {
      const isSupport =
        /refund|return policy|support|help me with my order/i.test(args.text);
      return {
        status: 'success',
        choices: [
          {
            variations: [
              {
                id: 301,
                decisionId: 'decision-assistant',
                payload: {
                  data: {
                    assistant: isSupport
                      ? `<p>${appConfig.muse.supportMessage}</p>`
                      : `<p>Here are a few looks for <b>${args.text}</b>.</p>`,
                    support: isSupport,
                    chatId: args.chatId ?? newId('chat'),
                    widgets: isSupport
                      ? []
                      : [
                          {
                            title: 'The look',
                            slots: assistantSlots(pick(CATALOG, 4)),
                          },
                          {
                            title: 'Pairs well with',
                            slots: assistantSlots(CATALOG.slice(4, 8)),
                          },
                        ],
                  },
                },
              },
            ],
          },
        ],
      };
    },

    async semanticSearch(args: {
      text: string;
      numItems: number;
    }): Promise<DySearchResult> {
      const query = args.text.toLowerCase();
      const matches = CATALOG.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query),
      );
      const products = matches.length ? matches : pick(CATALOG, 6);

      return {
        status: 'success',
        choice: {
          variations: [
            {
              id: 401,
              decisionId: 'decision-search',
              payload: {
                data: {
                  slots: products.slice(0, args.numItems).map(slotOf),
                  // Simula el spellcheck cuando no hubo coincidencias.
                  spellCheckedQuery: matches.length ? args.text : 'dress',
                  totalNumResults: products.length,
                },
              },
            },
          ],
        },
      };
    },

    async visualSearch(): Promise<DySearchResult> {
      return {
        status: 'success',
        choice: {
          variations: [
            {
              id: 402,
              decisionId: 'decision-visual-search',
              payload: {
                data: {
                  slots: pick(CATALOG, 6).map(slotOf),
                  totalNumResults: 6,
                },
              },
            },
          ],
        },
      };
    },
  };
};
