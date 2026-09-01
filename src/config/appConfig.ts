/**
 * Configuración central de la app — port de `Configuration.swift`.
 *
 * Los nombres de selector son los de la sección real de DY y son
 * **case-sensitive**: si no coinciden exactamente, el `choose` responde sin esa
 * campaña y la pantalla se queda vacía sin error visible.
 */

import {
  DY_API_KEY,
  DY_DATA_CENTER,
  DY_PROFILE_ANYWHERE_API_KEY,
  DY_SECTION_ID,
  hasRealKeys,
} from './dyKeys';

export const appConfig = {
  // ---- Dynamic Yield -------------------------------------------------------
  dyApiKey: DY_API_KEY,
  profileAnywhereApiKey: DY_PROFILE_ANYWHERE_API_KEY,
  dataCenter: DY_DATA_CENTER,
  /** Param `sec` del endpoint rcom de afinidades. */
  sectionId: DY_SECTION_ID,
  /** Param `limit`: cuántos valores por dimensión de afinidad. */
  affinityResultLimit: 5,
  enableDyRecommendations: true,

  // ---- Selectores ----------------------------------------------------------
  selectors: {
    homeRecs: 'Home Recs',
    heroBanner: 'Hero Banner Mobile',
    /** Los 4 banners del carrusel bajo el hero. Payload: image/title/subtitle. */
    homeBanners: [
      'Home Banner 1',
      'Home Banner 2',
      'Home Banner 3',
      'Home Banner 4',
    ],
    secondaryBanner1: 'Secondary Banner 1',
    secondaryBanner2: 'Secondary Banner 2',
    secondaryBanner3: 'Secondary Banner 3',
    bottomBanner: 'Bottom Banner',
    /** "Most Popular" que se muestra en Explore. Trae `title` en el custom. */
    searchOverlayRecs: 'Search Overlay Recs',
    /** Similares del PDP. Trae `title` en el custom. */
    pdpRecs: 'PDP Recs',
    /** Recomendaciones del carrito; se manda el grupo de SKUs. */
    cartRecs: 'Cart Recs',
    singleProduct: 'Fetch Single Product',
    mostPopularInCategory: 'Most Popular in Category',
    /** Ranking personalizado por afinidad ("Best for you"). */
    mostAffinityInCategory: 'Most Affinity with in Category',
    socialProof: 'Social Proof',
    /** Config + productos de la pantalla inicial de Muse. */
    museHome: 'Muse Home',
  },

  /** Custom attribute (real-time filter) con el nombre de la categoría. */
  categoryFilterAttribute: 'category-filter',

  // ---- Overlay de búsqueda por categoría -----------------------------------
  categorySearchTitle: 'Try using some popular searches for this category',
  categorySearchResultLimit: 4,
  /** Key = nombre de categoría, case-sensitive. */
  categoryPopularSearches: {
    Kids: [
      "Kids' sneakers",
      "Kids' hoodies",
      "Kids' jeans",
      "Kids' t-shirts",
      "Kids' jackets",
    ],
    Women: [
      "Women's dresses",
      "Women's handbags",
      "Women's sneakers",
      "Women's jeans",
      "Women's blazers",
    ],
    Men: [
      "Men's casual shirts",
      "Men's dress shoes",
      "Men's leather jackets",
      "Men's chinos",
      "Men's watches",
    ],
    Beauty: [
      'Skincare serums',
      'Luxury fragrances',
      'Makeup palettes',
      'Hair care products',
      'Face moisturizers',
    ],
    Home: [
      'Throw pillows',
      'Area rugs',
      'Bedding sets',
      'Table lamps',
      'Decorative vases',
    ],
  } as Record<string, string[]>,

  // ---- Shopping Muse -------------------------------------------------------
  muse: {
    /** Se sobreescribe con lo que devuelva el selector "Muse Home". */
    assistantName: 'Personal Shopper',
    inputPlaceholder: 'What are you looking for?',
    welcomeMessage:
      "Hi! I'm your personal shopper. What are you looking for today?",
    maxChars: 70,
    primaryColor: '#7C5CFC',
    secondaryColor: '#EAF0FF',
    bannerText: 'Meet your personal shopper',
    bannerCta: 'Ask Muse',
    fallbackSuggestions: [
      'Date night look',
      'Trending handbags',
      'Spring style event',
      'Sleek and chic',
    ],
    errorMessage: 'Something went wrong, please try again...',
    supportMessage: 'For further assistance, please contact our support team.',
  },

  // ---- Personalized Inspirations -------------------------------------------
  inspirations: {
    eyebrow: 'Personalized for you',
    title: 'Shopping Inspiration',
    subtitle: "Pick a vibe and we'll style a few looks just for you.",
    resultsEyebrow: 'Your looks',
    resetText: 'Clear',
    loadingText: 'Styling your looks…',
    options: [
      {
        id: 'first',
        title: 'Date Night',
        description: 'Elegant looks for a night out',
        prompt: 'Put together a few elegant date night outfits for me',
      },
      {
        id: 'second',
        title: 'Weekend Casual',
        description: 'Relaxed, everyday style',
        prompt: 'Show me some relaxed weekend casual looks',
      },
      {
        id: 'third',
        title: 'Office Ready',
        description: 'Polished workwear to feel confident',
        prompt: 'Style a few polished office-ready outfits for me',
      },
    ],
  },

  // ---- Complete the Look (PDP, vía Muse) -----------------------------------
  completeLook: {
    title: 'Complete the Look',
    /** `{sku}` se reemplaza por el SKU del producto del PDP. */
    prompt:
      'Complete the look for the product with SKU {sku}. Recommend complementary items that pair well with it to build a full outfit.',
    cta: 'Add to Cart',
    maxProducts: 6,
    loadingText: 'Styling your look…',
  },

  // ---- Moneda --------------------------------------------------------------
  currency: 'USD',
  currencySymbol: '$',

  // ---- Privacidad ----------------------------------------------------------
  /** DY no persiste el consentimiento entre lanzamientos: se pasa en cada init. */
  defaultActiveConsent: true,

  // ---- Debug ---------------------------------------------------------------
  debugMode: __DEV__,
} as const;

/** `false` mientras las claves sigan siendo los placeholders del repo. */
export const isDynamicYieldConfigured = hasRealKeys;
