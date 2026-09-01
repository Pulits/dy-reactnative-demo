/**
 * Vocabulario de Dynamic Yield.
 *
 * Calcado de la API real de `@dynamicyield/react-native-sdk`, pero declarado
 * aparte a propósito: la app depende de esta capa, no del SDK, así que el
 * adaptador nativo y el simulado son intercambiables.
 */

/** Espejo de `ResultStatus`. El SDK **no lanza**: devuelve el estado aquí. */
export type DyStatus = 'success' | 'warning' | 'error' | string;

/**
 * `warning` cuenta como éxito: DY responde con datos utilizables y solo avisa
 * de algo secundario. Tratarlo como error dejaría pantallas vacías sin motivo.
 */
export const isSuccessfulStatus = (status: DyStatus): boolean =>
  status === 'success' || status === 'warning';

export interface DyResult {
  status: DyStatus;
}

/** Espejo de `PageType`. */
export type DyPageType = 'HOMEPAGE' | 'CATEGORY' | 'PRODUCT' | 'CART' | 'OTHER';

/**
 * Contexto de la pantalla actual.
 *
 * `location` es obligatorio (`pageLocation`): DY lo trata como la URL de la
 * pantalla y segmenta con él. La app de iOS usa etiquetas planas ("Home",
 * "PDP", "Cart", "Muse Home", "Search"), así que se mantienen idénticas para
 * que las campañas segmenten igual en ambas plataformas.
 *
 * `data` depende de `type`: en PRODUCT el SKU, en CATEGORY la jerarquía de
 * categorías, en CART los SKUs del carrito, y en HOMEPAGE va vacío.
 */
export interface DyPage {
  type: DyPageType;
  location: string;
  data: string[];
}

export const homePage = (location = 'Home'): DyPage => ({
  type: 'HOMEPAGE',
  location,
  data: [],
});

export const categoryPage = (
  categories: string[],
  location = 'Category',
): DyPage => ({ type: 'CATEGORY', location, data: categories });

export const productPage = (sku: string, location = 'PDP'): DyPage => ({
  type: 'PRODUCT',
  location,
  data: [sku],
});

export const cartPage = (cart: string[], location = 'Cart'): DyPage => ({
  type: 'CART',
  location,
  data: cart,
});

export const otherPage = (location: string, data: string): DyPage => ({
  type: 'OTHER',
  location,
  data: [data],
});

/** Custom attribute de página (real-time filter). */
export type DyPageAttributes = Record<string, string>;

export interface DyConfig {
  apiKey: string;
  dataCenter: 'US' | 'EU';
  locale: string;
  /** DY no persiste el consentimiento entre lanzamientos: se pasa siempre. */
  activeConsentAccepted: boolean;
  debug: boolean;
}

/** Identidad enviada en cada Choose. */
export interface DyIdentity {
  cuid?: string;
  cuidType?: string;
}

// ---- Choose -----------------------------------------------------------------

/**
 * Producto tal y como lo devuelve el feed dentro de un slot.
 *
 * Los nombres son los del feed: `snake_case` para los campos que DY define y
 * un `extra` abierto con lo que traiga la sección. El precio puede llegar como
 * cadena.
 */
export interface DyProductData {
  groupId?: string;
  name?: string;
  price?: number | string;
  imageUrl?: string;
  categories?: (string | null)[];
  inStock?: boolean;
  extra: Record<string, unknown>;
}

export interface DySlot {
  slotId?: string;
  productData?: DyProductData;
}

/** Payload de una campaña de recomendaciones (RECS). */
export interface DyRecsPayload {
  type: 'RECS';
  data: {
    slots: DySlot[];
    /** JSON **sin parsear** con el encabezado (title/subtitle) de la campaña. */
    custom: string;
  };
}

/** Payload de una campaña de contenido. `data` llega como cadena JSON. */
export interface DyCustomJsonPayload {
  type: 'CUSTOM_JSON';
  data: string;
}

export type DyPayload = DyRecsPayload | DyCustomJsonPayload;

export interface DyVariation {
  /** Los ids de variación son **numéricos**, no cadenas. */
  id?: number;
  /** Sin él no se puede atribuir engagement. En NO_DECISION no viene. */
  decisionId?: string;
  payload: DyPayload;
}

export interface DyChoice {
  name: string;
  variations: DyVariation[];
}

export interface DyChooseResult extends DyResult {
  choices?: DyChoice[];
}

export interface DyChooseRequest {
  selectorNames: string[];
  page: DyPage;
  pageAttributes?: DyPageAttributes;
  identity?: DyIdentity;
}

// ---- Eventos ----------------------------------------------------------------

/** Espejo de `CartInnerItem`. */
export interface DyCartLine {
  productId: string;
  quantity: number;
  itemPrice: number;
}

export type DyEventValue =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean };

// ---- Assistant (Shopping Muse) ----------------------------------------------

export interface DyAssistantWidget {
  title?: string;
  slots: DySlot[];
}

export interface DyAssistantData {
  /** Texto del asistente; puede venir con HTML. */
  assistant?: string;
  widgets?: DyAssistantWidget[];
  /** El asistente derivó la consulta a atención al cliente. */
  support?: boolean;
  chatId?: string;
}

export interface DyAssistantResult extends DyResult {
  choices?: {
    variations: {
      id?: number;
      decisionId?: string;
      payload: { data: DyAssistantData };
    }[];
  }[];
}

// ---- Search -----------------------------------------------------------------

/** String filter de búsqueda (p. ej. `categories` = "Women"). */
export interface DySearchFilter {
  field: string;
  values: string[];
}

export interface DySearchData {
  slots?: DySlot[];
  /** Query corregida por el spellcheck del servidor. */
  spellCheckedQuery?: string;
  totalNumResults?: number;
}

export interface DySearchResult extends DyResult {
  choice?: {
    variations: {
      id?: number;
      decisionId?: string;
      payload: { data: DySearchData };
    }[];
  };
}
