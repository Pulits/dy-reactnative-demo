/**
 * Port de `DynamicYieldManager.swift`.
 *
 * Concentra todo lo que la app sabe de Dynamic Yield: qué selector pide cada
 * pantalla, cómo se interpreta cada payload y qué se registra en el informe de
 * actividad. Habla siempre contra `DyClient`, así que el mismo código corre con
 * el SDK real y con el adaptador simulado.
 */

import { appConfig } from '../config/appConfig';
import {
  EMPTY_RECOMMENDATIONS,
  EMPTY_SEARCH,
  PRODUCT_CATEGORIES,
  skuOf,
} from '../models';
import type {
  ActivityEntry,
  ActivityKind,
  Campaign,
  CartItem,
  HomeRecommendations,
  MuseHome,
  MuseReply,
  Product,
  ProductCategory,
  SearchResults,
  SocialProof,
} from '../models';
import type { DyClient } from './DyClient';
import { fetchAffinityProfile } from './affinity';
import type { AffinityResult } from './affinity';
import {
  extractPayload,
  htmlToPlainText,
  isRecsPayload,
  nonEmpty,
  parseProducts,
  parseRecsHeader,
} from './parse';
import type {
  DyCartLine,
  DyChoice,
  DyIdentity,
  DyPage,
  DyVariation,
} from './types';
import {
  cartPage,
  categoryPage,
  homePage,
  isSuccessfulStatus,
  productPage,
} from './types';

/** Modo del perfil de afinidad; define qué endpoint se consulta. */
export type AffinityMode = 'affinityProfile' | 'profileAnywhere';

export const affinityModeTitle = (mode: AffinityMode): string =>
  mode === 'affinityProfile' ? 'Affinity Profile' : 'Profile Anywhere';

/** Persistencia mínima de la identidad entre lanzamientos. */
export interface DyStorage {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

/**
 * Store en memoria.
 *
 * iOS guarda la identidad en `UserDefaults`, así que sobrevive a un cierre de
 * la app. Aquí no: hacerlo pediría `AsyncStorage`, y añadir una dependencia
 * nativa nueva ahora mismo no se puede verificar (el lockfile no se puede
 * regenerar sin el token de GitHub Packages). Cambiar a AsyncStorage es
 * implementar esta interfaz y pasarla al constructor.
 */
export const createMemoryStorage = (): DyStorage => {
  const map = new Map<string, string>();
  return {
    get: key => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
  };
};

const STORAGE_KEYS = {
  affinityMode: 'dy-affinity-mode',
  identityValue: 'dy-identity-value',
  cuidType: 'dy-cuid-type',
};

/** Estado observable del servicio. */
export interface DyState {
  initialized: boolean;
  dyid: string;
  sessionId: string;
  activeConsentAccepted: boolean;
  /** Se incrementa en cada regeneración del dyid, para que las vistas recarguen. */
  dyidResetCounter: number;
  affinityMode: AffinityMode;
  identityValue: string;
  cuidType: string;
  pageViewCount: number;
  engagementCount: number;
  eventCount: number;
  recentlyViewed: Product[];
  activityLog: ActivityEntry[];
}

const MAX_ACTIVITY_ENTRIES = 200;
const MAX_RECENTLY_VIEWED = 12;

export class DyService {
  private state: DyState;
  private listeners = new Set<() => void>();
  private entrySeq = 0;

  constructor(
    private readonly client: DyClient,
    private readonly storage: DyStorage = createMemoryStorage(),
  ) {
    const savedMode = storage.get(STORAGE_KEYS.affinityMode);
    this.state = {
      initialized: false,
      dyid: '',
      sessionId: '',
      activeConsentAccepted: appConfig.defaultActiveConsent,
      dyidResetCounter: 0,
      affinityMode:
        savedMode === 'profileAnywhere' ? 'profileAnywhere' : 'affinityProfile',
      identityValue: storage.get(STORAGE_KEYS.identityValue) ?? '',
      cuidType: storage.get(STORAGE_KEYS.cuidType) ?? 'id',
      pageViewCount: 0,
      engagementCount: 0,
      eventCount: 0,
      recentlyViewed: [],
      activityLog: [],
    };
  }

  // ---- Observabilidad -------------------------------------------------------

  getState = (): DyState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<DyState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }

  private log(message: string): void {
    if (appConfig.debugMode) {
      console.log(message);
    }
  }

  private logActivity(
    kind: ActivityKind,
    title: string,
    detail: string,
    counter: 'pageViewCount' | 'engagementCount' | 'eventCount',
  ): void {
    this.entrySeq += 1;
    const entry: ActivityEntry = {
      id: `${Date.now()}-${this.entrySeq}`,
      kind,
      title,
      detail,
      date: Date.now(),
    };
    this.update({
      [counter]: this.state[counter] + 1,
      activityLog: [entry, ...this.state.activityLog].slice(
        0,
        MAX_ACTIVITY_ENTRIES,
      ),
    } as Partial<DyState>);
  }

  activityEntries = (kind: ActivityKind): ActivityEntry[] =>
    this.state.activityLog.filter(entry => entry.kind === kind);

  // ---- Ciclo de vida --------------------------------------------------------

  async initialize(): Promise<void> {
    // Anti doble-init: re-inicializar pisaría el dyid y la sesión en curso.
    if (this.state.initialized) {
      this.log(`ℹ️ DY ya inicializado (dyid=${this.state.dyid})`);
      return;
    }

    await this.client.initialize({
      apiKey: appConfig.dyApiKey,
      dataCenter: appConfig.dataCenter,
      locale: 'en_US',
      activeConsentAccepted: this.state.activeConsentAccepted,
      debug: appConfig.debugMode,
    });

    this.update({ initialized: true });
    await this.refreshIdentifiers();
    this.log('✅ Dynamic Yield configurado');
  }

  private async refreshIdentifiers(): Promise<void> {
    const [dyid, sessionId] = await Promise.all([
      this.client.getDyId(),
      this.client.getSessionId(),
    ]);
    this.update({ dyid, sessionId });
  }

  /**
   * Mintea un dyid nuevo, siguiendo el flujo de identity management de DY.
   *
   * El orden importa: tras el reset hace falta un **Choose** para que el
   * servidor asigne dyid y sesión. Un pageview no vale — exige una sesión ya
   * válida y responde 422 justo después del reset. La llamada va anónima (sin
   * cuid) precisamente para que el id que se asigne sea nuevo.
   */
  async regenerateDyid(): Promise<string> {
    if (!this.state.initialized) {
      await this.initialize();
    }
    if (!this.state.initialized) {
      this.log('⚠️ SDK no inicializado; no se puede resetear el dyid');
      return this.state.dyid;
    }

    this.log('🧹 Regenerando dyid...');
    await this.client.resetUserIdAndSessionId();

    // Estado local: se limpia para que la sesión parezca de un usuario nuevo.
    this.update({
      pageViewCount: 0,
      engagementCount: 0,
      eventCount: 0,
      recentlyViewed: [],
      activityLog: [],
    });

    await this.client.chooseVariations({
      selectorNames: [appConfig.selectors.homeRecs],
      page: homePage(),
    });

    await this.refreshIdentifiers();
    this.update({ dyidResetCounter: this.state.dyidResetCounter + 1 });
    this.log(`✅ dyid regenerado: ${this.state.dyid || '(vacío)'}`);
    return this.state.dyid;
  }

  // ---- Identidad ------------------------------------------------------------

  get cuid(): string | undefined {
    return nonEmpty(this.state.identityValue);
  }

  /**
   * Identidad que se manda en cada Choose.
   *
   * Solo se identifica cuando hay un cliente real (email). Con un dyid va
   * anónimo a propósito: así el comportamiento se acumula en el dyid anónimo
   * del SDK, que es justo lo que lee `rcom/userAffinities`. Mandar el dyid como
   * `cuid` atribuye todo a un perfil "identificado" y rompe las afinidades.
   */
  private get chooseIdentity(): DyIdentity | undefined {
    if (this.state.cuidType !== 'email') {
      return undefined;
    }
    const cuid = this.cuid;
    return cuid ? { cuid, cuidType: 'email' } : undefined;
  }

  setIdentity(mode: AffinityMode, cuidType: string, value: string): boolean {
    const newValue = value.trim();
    const identityChanged =
      !!this.state.identityValue && newValue !== this.state.identityValue;

    this.storage.set(STORAGE_KEYS.affinityMode, mode);
    this.storage.set(STORAGE_KEYS.cuidType, cuidType);
    this.storage.set(STORAGE_KEYS.identityValue, newValue);

    this.update({
      affinityMode: mode,
      cuidType,
      identityValue: newValue,
      ...(identityChanged ? { recentlyViewed: [] } : {}),
    });

    this.log(`👤 Identidad activa: ${mode} ${cuidType}=${newValue}`);
    return identityChanged;
  }

  // ---- Consentimiento -------------------------------------------------------

  async setActiveConsent(accepted: boolean): Promise<void> {
    this.update({ activeConsentAccepted: accepted });
    this.log(`🔐 Active consent → ${accepted}`);
    if (this.state.initialized) {
      await this.client.setActiveConsentAccepted(accepted);
    }
  }

  // ---- Pageviews ------------------------------------------------------------

  async reportPageView(type: string, category?: string): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    // El pageview de producto lo dispara reportProductView con el SKU real.
    if (type === 'product') {
      return;
    }

    this.logActivity(
      'pageView',
      type.charAt(0).toUpperCase() + type.slice(1),
      category ?? 'Page view',
      'pageViewCount',
    );

    const result =
      type === 'home'
        ? await this.client.reportHomePageView('Home')
        : type === 'category'
        ? await this.client.reportCategoryPageView(
            'Category',
            category ? [category] : [],
          )
        : await this.client.reportOtherPageView(
            type.charAt(0).toUpperCase() + type.slice(1),
            type,
          );

    this.log(`📄 Pageview '${type}' → ${result.status}`);
  }

  async reportCartPageView(cartSkus: string[]): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    this.logActivity(
      'pageView',
      'Cart',
      cartSkus.length ? `${cartSkus.length} item(s)` : 'Empty cart',
      'pageViewCount',
    );
    const result = await this.client.reportCartPageView('Cart', cartSkus);
    this.log(`🛒 Cart pageview: ${cartSkus.length} sku(s) → ${result.status}`);
  }

  async reportProductView(product: Product): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    const sku = skuOf(product);

    this.trackRecentlyViewed(product);
    this.logActivity(
      'pageView',
      'Product (PDP)',
      `${product.name} · sku ${sku}`,
      'pageViewCount',
    );

    const result = await this.client.reportProductPageView('PDP', sku);
    this.log(
      `👁️ Product pageview: ${product.name} sku=${sku} → ${result.status}`,
    );

    // "Recently viewed" no tiene evento estándar en el SDK → evento custom.
    await this.reportRecentlyViewedCustomEvent(product);
  }

  private async reportRecentlyViewedCustomEvent(
    product: Product,
  ): Promise<void> {
    this.logActivity(
      'event',
      'Recently Viewed (custom)',
      product.name,
      'eventCount',
    );
    const result = await this.client.reportCustomEvent({
      eventName: 'Recently Viewed',
      properties: {
        productId: { kind: 'string', value: skuOf(product) },
        name: { kind: 'string', value: product.name },
        category: { kind: 'string', value: product.category },
        price: { kind: 'number', value: product.price },
      },
    });
    this.log(`🧾 Custom event 'Recently Viewed' → ${result.status}`);
  }

  private trackRecentlyViewed(product: Product): void {
    const rest = this.state.recentlyViewed.filter(p => p.id !== product.id);
    this.update({
      recentlyViewed: [product, ...rest].slice(0, MAX_RECENTLY_VIEWED),
    });
  }

  // ---- Eventos de negocio ---------------------------------------------------

  private cartLines(items: CartItem[]): DyCartLine[] {
    return items.map(item => ({
      productId: skuOf(item.product),
      quantity: item.quantity,
      itemPrice: item.product.price,
    }));
  }

  private money(value: number): string {
    return `${appConfig.currencySymbol}${value.toFixed(2)}`;
  }

  async reportAddToCart(product: Product, quantity = 1): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    const qty = Math.max(1, quantity);
    const sku = skuOf(product);
    const value = product.price * qty;

    this.logActivity(
      'event',
      'Add to Cart',
      `${product.name} x${qty} · ${this.money(value)}`,
      'eventCount',
    );
    const result = await this.client.reportAddToCart({
      eventName: 'Add to Cart',
      value,
      currency: appConfig.currency,
      productId: sku,
      quantity: qty,
      cart: [{ productId: sku, quantity: qty, itemPrice: product.price }],
    });
    this.log(`🛒 Add to Cart: ${product.name} x${qty} → ${result.status}`);
  }

  async reportRemoveFromCart(product: Product, quantity = 1): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    const qty = Math.max(1, quantity);
    const sku = skuOf(product);

    this.logActivity(
      'event',
      'Remove from Cart',
      `${product.name} x${qty}`,
      'eventCount',
    );
    const result = await this.client.reportRemoveFromCart({
      eventName: 'Remove from Cart',
      value: product.price * qty,
      currency: appConfig.currency,
      productId: sku,
      quantity: qty,
      cart: [{ productId: sku, quantity: qty, itemPrice: product.price }],
    });
    this.log(`🗑️ Remove from Cart: ${product.name} x${qty} → ${result.status}`);
  }

  /** Mantiene el carrito de DY al día entre sesiones y dispositivos. */
  async reportSyncCart(items: CartItem[]): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    const cart = this.cartLines(items);
    const value = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    this.logActivity(
      'event',
      'Sync Cart',
      `${cart.length} línea(s) · ${this.money(value)}`,
      'eventCount',
    );
    const result = await this.client.reportSyncCart({
      eventName: 'Sync Cart',
      value,
      currency: appConfig.currency,
      cart,
    });
    this.log(`🔁 Sync Cart: ${cart.length} línea(s) → ${result.status}`);
  }

  async reportPurchase(items: CartItem[], total: number): Promise<void> {
    if (!this.state.initialized || items.length === 0) {
      return;
    }
    const cart = this.cartLines(items);

    this.logActivity(
      'event',
      'Purchase',
      `${cart.length} item(s) · ${this.money(total)}`,
      'eventCount',
    );
    const result = await this.client.reportPurchase({
      eventName: 'Purchase',
      value: total,
      currency: appConfig.currency,
      // Para que DY deduplique si la compra se reintenta.
      uniqueTransactionId: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      cart,
    });
    this.log(`💰 Purchase: ${this.money(total)} → ${result.status}`);
  }

  async reportAddToWishlist(product: Product): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    this.logActivity('event', 'Add to Wishlist', product.name, 'eventCount');
    const result = await this.client.reportAddToWishlist({
      eventName: 'Add to Wishlist',
      productId: skuOf(product),
    });
    this.log(`💜 Add to Wishlist: ${product.name} → ${result.status}`);
  }

  async reportKeywordSearch(keywords: string): Promise<void> {
    const trimmed = keywords.trim();
    if (!this.state.initialized || !trimmed) {
      return;
    }
    this.logActivity('event', 'Keyword Search', trimmed, 'eventCount');
    const result = await this.client.reportKeywordSearch({
      eventName: 'Keyword Search',
      keywords: trimmed,
    });
    this.log(`🔎 Keyword Search: '${trimmed}' → ${result.status}`);
  }

  async reportLogin(): Promise<void> {
    const id = this.cuid;
    if (!this.state.initialized || !id) {
      return;
    }
    this.logActivity(
      'event',
      'Login',
      `${this.state.cuidType} = ${id}`,
      'eventCount',
    );
    const result = await this.client.reportLogin({
      eventName: 'Login',
      cuidType: this.state.cuidType,
      cuid: id,
    });
    this.log(`🔐 Login: ${this.state.cuidType}=${id} → ${result.status}`);
  }

  // ---- Engagement -----------------------------------------------------------

  /** SLOT_CLICK si el producto trae slot; si no, CLICK con el decisionId. */
  async reportRecommendationClick(product: Product): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    if (product.slotId) {
      this.logActivity(
        'engagement',
        'SLOT_CLICK',
        product.name,
        'engagementCount',
      );
      const result = await this.client.reportSlotClick({
        variationId: product.variationId,
        slotId: product.slotId,
      });
      this.log(`👆 SLOT_CLICK ${product.slotId} → ${result.status}`);
      return;
    }
    if (product.decisionId) {
      this.logActivity('engagement', 'CLICK', product.name, 'engagementCount');
      const result = await this.client.reportClick({
        decisionId: product.decisionId,
        variationId: product.variationId,
      });
      this.log(`👆 CLICK ${product.decisionId} → ${result.status}`);
    }
  }

  async reportRecommendationImpressions(products: Product[]): Promise<void> {
    if (!this.state.initialized) {
      return;
    }
    const slotIds = products
      .map(p => p.slotId)
      .filter((id): id is string => !!id);
    if (slotIds.length === 0) {
      return;
    }
    this.logActivity(
      'engagement',
      'SLOT_IMP',
      `${slotIds.length} slot(s)`,
      'engagementCount',
    );
    const result = await this.client.reportSlotsImpression({
      variationId: products.find(p => p.variationId !== undefined)?.variationId,
      slotIds,
    });
    this.log(`👁️‍🗨️ SLOT_IMP ${slotIds.length} slots → ${result.status}`);
  }

  // ---- Choose: helpers ------------------------------------------------------

  /** La choice del selector pedido, si la respuesta trajo algo utilizable. */
  private async chooseOne(
    selector: string,
    page: DyPage,
    pageAttributes?: Record<string, string>,
  ): Promise<{ choice: DyChoice; variation: DyVariation } | undefined> {
    const result = await this.client.chooseVariations({
      selectorNames: [selector],
      page,
      pageAttributes,
      identity: this.chooseIdentity,
    });

    // El servidor asigna dyid y sesión en la primera llamada a Choose, así que
    // el valor cacheado se queda corto justo cuando hace falta (las afinidades
    // se consultan por dyid). iOS lo lee en vivo; aquí se refresca aquí.
    await this.refreshIdentifiers();

    if (!isSuccessfulStatus(result.status)) {
      this.log(`❌ Choose '${selector}' → ${result.status}`);
      return undefined;
    }
    const choice = result.choices?.find(c => c.name === selector);
    const variation = choice?.variations[0];
    if (!choice || !variation) {
      // NO_DECISION no es un error: el usuario no entra en la campaña.
      this.log(`⚠️ Choose '${selector}': sin variación`);
      return undefined;
    }
    return { choice, variation };
  }

  /** Recomendaciones de un selector, ya parseadas y con su encabezado. */
  private async chooseRecs(
    selector: string,
    page: DyPage,
    options: {
      fallbackCategory?: string;
      pageAttributes?: Record<string, string>;
    } = {},
  ): Promise<HomeRecommendations> {
    const found = await this.chooseOne(selector, page, options.pageAttributes);
    // El guard estrecha esta constante; hacerlo sobre found.variation.payload
    // no sobreviviría a la desestructuración de abajo.
    const payload = found?.variation.payload;
    if (!found || !isRecsPayload(payload)) {
      return EMPTY_RECOMMENDATIONS;
    }
    const { variation } = found;

    const products = parseProducts(payload.data.slots, {
      fallbackCategory: options.fallbackCategory,
      decisionId: variation.decisionId,
      variationId: variation.id,
    });
    const header = parseRecsHeader(payload.data.custom);

    this.log(`✅ '${selector}': ${products.length} productos`);
    return { ...header, products };
  }

  // ---- Recomendaciones ------------------------------------------------------

  getRecommendations(
    selectorName: string = appConfig.selectors.homeRecs,
    category?: string,
  ): Promise<HomeRecommendations> {
    return this.chooseRecs(selectorName, homePage(), {
      fallbackCategory: category,
    });
  }

  /** Similares del PDP, excluyendo el propio producto. */
  async getPdpRecommendations(
    productId: string,
    sku?: string,
  ): Promise<HomeRecommendations> {
    const recs = await this.chooseRecs(
      appConfig.selectors.pdpRecs,
      productPage(sku ?? productId),
    );
    return {
      ...recs,
      products: recs.products.filter(p => p.id !== productId),
    };
  }

  /**
   * Recomendaciones de categoría (Most Popular / Most Affinity).
   *
   * El nombre de la categoría viaja además como custom attribute
   * (`category-filter`), que es lo que lee el real-time filter de la campaña.
   * Es **case-sensitive**: "Women", no "women".
   */
  getCategoryRecs(
    category: string,
    selector: string,
  ): Promise<HomeRecommendations> {
    return this.chooseRecs(selector, categoryPage([category]), {
      fallbackCategory: category,
      pageAttributes: { [appConfig.categoryFilterAttribute]: category },
    });
  }

  /** Recomendaciones del carrito, excluyendo lo que ya está dentro. */
  async getCartRecommendations(
    cartSkus: string[],
  ): Promise<HomeRecommendations> {
    if (cartSkus.length === 0) {
      return EMPTY_RECOMMENDATIONS;
    }
    const recs = await this.chooseRecs(
      appConfig.selectors.cartRecs,
      cartPage(cartSkus),
    );
    const inCart = new Set(cartSkus);
    return {
      ...recs,
      products: recs.products.filter(
        p => !inCart.has(p.sku ?? '') && !inCart.has(p.id),
      ),
    };
  }

  async getSingleProductRecommendation(
    productId: string,
    sku?: string,
  ): Promise<Product | undefined> {
    const skuToUse = sku ?? productId;
    const recs = await this.chooseRecs(
      appConfig.selectors.singleProduct,
      productPage(skuToUse),
      { pageAttributes: { 'sent-sku': skuToUse } },
    );
    return recs.products[0];
  }

  // ---- Campañas de contenido ------------------------------------------------

  async getHeroBanner(
    selectorName: string = appConfig.selectors.heroBanner,
  ): Promise<Campaign | undefined> {
    const found = await this.chooseOne(selectorName, homePage());
    const payload = extractPayload(found?.variation.payload);
    if (!payload) {
      return undefined;
    }

    const image = payload.image as string | undefined;
    const maintext = payload.maintext as string | undefined;
    if (!image || !maintext) {
      this.log(`⚠️ Hero '${selectorName}': faltan image/maintext`);
      return undefined;
    }

    return {
      id: `dy-hero-${found?.variation.id ?? 0}`,
      title: maintext,
      subtitle: nonEmpty(payload.subtext as string),
      imageUrl: image,
      textColor: (payload.fontcolor as string) ?? '#ffffff',
      ctaText: nonEmpty(payload.buttonCta as string),
      categoryName: nonEmpty(payload.category as string),
    };
  }

  /** Un banner del carrusel del home. Payload: { image, title, subtitle }. */
  async getBanner(selectorName: string): Promise<Campaign | undefined> {
    const found = await this.chooseOne(selectorName, homePage());
    const payload = extractPayload(found?.variation.payload);
    if (!payload) {
      return undefined;
    }

    const image = payload.image as string | undefined;
    const title = payload.title as string | undefined;
    if (!image || !title) {
      this.log(`⚠️ Banner '${selectorName}': faltan image/title`);
      return undefined;
    }

    return {
      id: `dy-banner-${selectorName}`,
      title,
      subtitle: nonEmpty(payload.subtitle as string),
      imageUrl: image,
      textColor: '#ffffff',
      categoryName: nonEmpty(payload.category as string),
    };
  }

  /** Social proof del PDP. `performance` puede llegar como número o cadena. */
  async getSocialProof(
    productId: string,
    sku?: string,
  ): Promise<SocialProof | undefined> {
    const found = await this.chooseOne(
      appConfig.selectors.socialProof,
      productPage(sku ?? productId),
    );
    const payload = extractPayload(found?.variation.payload);
    if (!payload) {
      return undefined;
    }

    const highlightedText = payload.highlightedtext as string | undefined;
    const text = payload.text as string | undefined;
    if (!highlightedText || !text) {
      return undefined;
    }

    const raw = payload.performance;
    const performance =
      typeof raw === 'string'
        ? raw
        : typeof raw === 'number'
        ? String(Math.trunc(raw))
        : undefined;
    if (performance === undefined) {
      return undefined;
    }

    return { highlightedText, text, performance };
  }

  // ---- Shopping Muse --------------------------------------------------------

  /**
   * Pantalla inicial de Muse: config y productos en una sola llamada. La
   * configuración (musename, searchplaceholder, suggestedsearch1..4) viene en
   * el `custom` de la campaña de recomendaciones.
   */
  async museHome(): Promise<MuseHome> {
    const fallback: MuseHome = {
      assistantName: appConfig.muse.assistantName,
      searchPlaceholder: appConfig.muse.inputPlaceholder,
      suggestions: [...appConfig.muse.fallbackSuggestions],
      products: [],
    };
    if (!this.state.initialized) {
      return fallback;
    }

    const found = await this.chooseOne(
      appConfig.selectors.museHome,
      homePage('Muse Home'),
    );
    const payload = found?.variation.payload;
    if (!found || !isRecsPayload(payload)) {
      return fallback;
    }
    const { variation } = found;

    const products = parseProducts(payload.data.slots, {
      decisionId: variation.decisionId,
      variationId: variation.id,
    });

    const custom = parseRecsHeaderRaw(payload.data.custom);
    const suggestions = [1, 2, 3, 4]
      .map(i => nonEmpty(custom?.[`suggestedsearch${i}`] as string))
      .filter((s): s is string => !!s);

    return {
      assistantName:
        nonEmpty(custom?.musename as string) ?? fallback.assistantName,
      searchPlaceholder:
        nonEmpty(custom?.searchplaceholder as string) ??
        fallback.searchPlaceholder,
      suggestions: suggestions.length ? suggestions : fallback.suggestions,
      products,
    };
  }

  museChat(text: string, chatId?: string): Promise<MuseReply> {
    return this.assistantReply(homePage('Muse Home'), text, chatId);
  }

  /**
   * "Complete the Look" del PDP: el mismo asistente con un prompt fijo que
   * inyecta el SKU actual, en contexto de página de producto.
   */
  completeTheLook(product: Product): Promise<MuseReply> {
    const sku = skuOf(product);
    const prompt = appConfig.completeLook.prompt.replace('{sku}', sku);
    return this.assistantReply(productPage(sku), prompt, undefined);
  }

  private async assistantReply(
    page: DyPage,
    text: string,
    chatId?: string,
  ): Promise<MuseReply> {
    const failure: MuseReply = {
      text: appConfig.muse.errorMessage,
      galleries: [],
      isSupport: false,
      chatId,
    };
    if (!this.state.initialized) {
      return failure;
    }

    const result = await this.client.chatWithAssistant({
      page,
      text,
      chatId,
      // `false` trae el producto completo del feed, no solo el SKU.
      skusOnly: false,
    });

    const variation = result.choices?.[0]?.variations[0];
    if (!isSuccessfulStatus(result.status) || !variation) {
      this.log(`❌ Assistant → ${result.status}`);
      return failure;
    }

    const data = variation.payload.data;
    const galleries = (data.widgets ?? []).map(widget => ({
      title: widget.title,
      products: parseProducts(widget.slots, {
        decisionId: variation.decisionId,
        variationId: variation.id,
      }),
    }));

    const assistantText = data.assistant
      ? nonEmpty(htmlToPlainText(data.assistant))
      : undefined;

    return {
      text: assistantText,
      galleries,
      isSupport: data.support ?? false,
      chatId: data.chatId ?? chatId,
    };
  }

  // ---- Experience Search ----------------------------------------------------

  async semanticSearch(
    text: string,
    limit = 24,
    categoryFilter?: string,
  ): Promise<SearchResults> {
    const trimmed = text.trim();
    if (!this.state.initialized || !trimmed) {
      return EMPTY_SEARCH;
    }

    const result = await this.client.semanticSearch({
      page: homePage('Search'),
      text: trimmed,
      filters: categoryFilter
        ? [{ field: 'categories', values: [categoryFilter] }]
        : undefined,
      numItems: limit,
      offset: 0,
      enableSpellCheck: true,
    });

    const variation = result.choice?.variations[0];
    if (!isSuccessfulStatus(result.status) || !variation) {
      return { query: trimmed, total: 0, products: [] };
    }

    const data = variation.payload.data;
    const products = parseProducts(data.slots ?? [], {
      decisionId: variation.decisionId,
      variationId: variation.id,
    });

    // "Did you mean": solo si el server corrigió y difiere de lo escrito.
    const corrected = nonEmpty(data.spellCheckedQuery);
    const didYouMean =
      corrected && corrected.toLowerCase() !== trimmed.toLowerCase()
        ? corrected
        : undefined;

    return {
      query: trimmed,
      correctedQuery: didYouMean,
      total: data.totalNumResults ?? products.length,
      products,
    };
  }

  async visualSearch(imageBase64: string): Promise<SearchResults> {
    if (!this.state.initialized || !imageBase64) {
      return EMPTY_SEARCH;
    }
    const result = await this.client.visualSearch({
      page: homePage('Search'),
      imageBase64,
    });

    const variation = result.choice?.variations[0];
    if (!isSuccessfulStatus(result.status) || !variation) {
      return EMPTY_SEARCH;
    }

    const data = variation.payload.data;
    const products = parseProducts(data.slots ?? [], {
      decisionId: variation.decisionId,
      variationId: variation.id,
    });

    return {
      query: '',
      total: data.totalNumResults ?? products.length,
      products,
    };
  }

  // ---- Afinidad -------------------------------------------------------------

  fetchAffinityProfile(): Promise<AffinityResult> {
    if (!this.state.initialized) {
      return Promise.resolve({
        ok: false,
        error: 'Dynamic Yield no está inicializado.',
      });
    }
    return fetchAffinityProfile({
      mode: this.state.affinityMode,
      cuid: this.cuid,
      cuidType: this.state.cuidType,
      dyid: this.state.dyid,
    });
  }

  /**
   * Orden de categorías según la afinidad del usuario.
   *
   * `undefined` cuando no hay afinidad utilizable (sin perfil, sin dimensión
   * `categories`, o todo a 0) para que la pantalla caiga al orden por defecto
   * en vez de mostrar un orden arbitrario.
   */
  async categoryAffinityOrder(): Promise<ProductCategory[] | undefined> {
    const profile = await this.fetchAffinityProfile();
    if (!profile.ok) {
      return undefined;
    }

    const dimension = profile.profile.dimensions.find(
      d => d.name.toLowerCase() === 'categories',
    );
    if (!dimension) {
      return undefined;
    }

    const scores = new Map<ProductCategory, number>();
    for (const value of dimension.values) {
      const match = PRODUCT_CATEGORIES.find(
        c => c.toLowerCase() === value.name.toLowerCase(),
      );
      if (match) {
        scores.set(match, (scores.get(match) ?? 0) + value.score);
      }
    }

    if (![...scores.values()].some(score => score > 0)) {
      return undefined;
    }

    // Con score primero (desc); sin score conservan el orden default. Estable.
    const defaults = [...PRODUCT_CATEGORIES];
    return defaults
      .map((category, index) => ({ category, index }))
      .sort((a, b) => {
        const sa = scores.get(a.category) ?? -1;
        const sb = scores.get(b.category) ?? -1;
        return sa === sb ? a.index - b.index : sb - sa;
      })
      .map(entry => entry.category);
  }

  /** Reordena campañas por afinidad, matcheando la categoría en el texto. */
  reorderCampaigns(
    campaigns: Campaign[],
    order: ProductCategory[],
  ): Campaign[] {
    if (campaigns.length <= 1) {
      return campaigns;
    }
    const rank = new Map<string, number>(
      order.map((category, index) => [category.toLowerCase(), index]),
    );

    const score = (campaign: Campaign): number => {
      const text = `${campaign.title} ${campaign.subtitle ?? ''}`.toLowerCase();
      const tokens = new Set(text.split(/[^a-z]+/).filter(Boolean));
      let best = Number.MAX_SAFE_INTEGER;
      rank.forEach((value, name) => {
        if (tokens.has(name)) {
          best = Math.min(best, value);
        }
      });
      return best;
    };

    return campaigns
      .map((campaign, index) => ({ campaign, index }))
      .sort((a, b) => {
        const sa = score(a.campaign);
        const sb = score(b.campaign);
        return sa === sb ? a.index - b.index : sa - sb;
      })
      .map(entry => entry.campaign);
  }
}

/** El `custom` de la campaña como objeto crudo (Muse mete ahí su config). */
const parseRecsHeaderRaw = (
  custom: string | undefined,
): Record<string, unknown> | undefined => {
  if (!custom?.trim()) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(custom);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};
