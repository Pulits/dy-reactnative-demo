import { createMockDyClient, SELECTORS } from '../src/dy/mockClient';
import { asBannerPayload, asRecommendationPayload } from '../src/dy/payloads';
import { toDisplayProduct } from '../src/catalog';
import type { DyConfig, DyPageContext } from '../src/dy/types';

const CONFIG: DyConfig = {
  apiKey: 'test-key',
  dataCenter: 'EU',
  locale: 'es_ES',
  consent: { granted: true },
  debug: false,
};

const HOME: DyPageContext = {
  type: 'HOMEPAGE',
  location: 'dydemo://home',
  data: [],
  locale: 'es_ES',
};
const PDP = (sku: string): DyPageContext => ({
  type: 'PRODUCT',
  location: `dydemo://product/${sku}`,
  data: [sku],
  locale: 'es_ES',
});

describe('DyClient (adaptador simulado)', () => {
  it('rechaza llamadas antes de init', async () => {
    const client = createMockDyClient();
    await expect(client.pageView(HOME)).rejects.toThrow(/antes de init/);
  });

  it('asigna identidad de usuario y sesión al inicializar', async () => {
    const client = createMockDyClient();
    expect(client.getIdentity().dyid).toBeNull();

    await client.init(CONFIG);

    const identity = client.getIdentity();
    expect(identity.dyid).toBeTruthy();
    expect(identity.sessionId).toBeTruthy();
  });

  it('devuelve una decisión con decisionId por cada selector conocido', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);

    const { choices } = await client.choose({
      selectors: [SELECTORS.homeRecs, SELECTORS.homeBanner],
      context: HOME,
    });

    expect(choices).toHaveLength(2);
    choices.forEach(choice => {
      expect(choice.decisionId).toMatch(/^dec_/);
      expect(choice.variations.length).toBeGreaterThan(0);
    });
  });

  it('ignora selectores desconocidos en vez de fallar', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);

    const { choices } = await client.choose({
      selectors: ['Campaña Que No Existe'],
      context: HOME,
    });

    expect(choices).toHaveLength(0);
  });

  it('excluye de los similares el producto que se está viendo', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);

    const { choices } = await client.choose({
      selectors: [SELECTORS.pdpRecs],
      context: PDP('SKU-1003'),
    });

    const payload = asRecommendationPayload(choices[0].variations[0]);
    expect(payload).not.toBeNull();
    expect(payload!.slots.map(slot => slot.sku)).not.toContain('SKU-1003');
  });

  it('registra la actividad enviada a DY en orden', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);
    await client.pageView(HOME);
    await client.trackEvent({
      kind: 'purchase',
      name: 'Purchase',
      value: 42,
      currency: 'EUR',
      uniqueTransactionId: 'TX-1',
      cart: [{ productId: 'SKU-1001', quantity: 1, itemPrice: 42 }],
    });

    expect(client.getLog().map(entry => entry.kind)).toEqual([
      'init',
      'pageview',
      'event',
    ]);
  });

  it('marca las decisiones como no personalizadas al denegar consentimiento', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);
    await client.setConsent(false);

    await client.choose({ selectors: [SELECTORS.homeRecs], context: HOME });

    const chooseEntry = client
      .getLog()
      .filter(entry => entry.kind === 'choose')
      .pop();
    expect(chooseEntry?.detail).toMatchObject({ personalized: false });
  });

  it('notifica a los suscriptores y deja de hacerlo al desuscribirse', async () => {
    const client = createMockDyClient();
    const listener = jest.fn();
    const unsubscribe = client.subscribe(listener);

    await client.init(CONFIG);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await client.pageView(HOME);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('validadores de payload', () => {
  it('acepta un payload de recomendaciones bien formado', () => {
    const payload = asRecommendationPayload({
      id: 1,
      payload: { type: 'RECS', data: { slots: [{ sku: 'SKU-1001' }] } },
    });
    expect(payload).toEqual({ slots: [{ sku: 'SKU-1001' }] });
  });

  it('descarta slots sin sku utilizable', () => {
    const payload = asRecommendationPayload({
      id: 1,
      payload: {
        type: 'RECS',
        data: { slots: [{ sku: '' }, { sku: 42 }, null] },
      },
    });
    expect(payload).toBeNull();
  });

  it('devuelve null si la plantilla de la campaña cambia de forma', () => {
    expect(
      asRecommendationPayload({
        id: 1,
        payload: { type: 'RECS', data: { productos: ['SKU-1001'] } },
      }),
    ).toBeNull();
    expect(asRecommendationPayload(undefined)).toBeNull();
  });

  it('exige título y cuerpo en el banner, y deja el cta opcional', () => {
    expect(
      asBannerPayload({
        id: 1,
        payload: { type: 'CUSTOM_JSON', data: { title: 'Hola', body: 'Texto' } },
      }),
    ).toEqual({ title: 'Hola', body: 'Texto', cta: undefined });

    expect(
      asBannerPayload({
        id: 1,
        payload: { type: 'CUSTOM_JSON', data: { title: 'Solo título' } },
      }),
    ).toBeNull();
  });

  it('parsea el CUSTOM_JSON que el SDK entrega como cadena', () => {
    // `CustomJsonPayload.data` es `string` en el SDK, no un objeto.
    expect(
      asBannerPayload({
        id: 1,
        payload: {
          type: 'CUSTOM_JSON',
          data: JSON.stringify({ title: 'Hola', body: 'Texto', cta: 'Ir' }),
        },
      }),
    ).toEqual({ title: 'Hola', body: 'Texto', cta: 'Ir' });
  });

  it('no revienta con una cadena que no es JSON válido', () => {
    expect(
      asBannerPayload({
        id: 1,
        payload: { type: 'CUSTOM_JSON', data: '{ esto no es json' },
      }),
    ).toBeNull();
  });

  it('el banner simulado usa la misma forma en cadena que el SDK real', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);

    const { choices } = await client.choose({
      selectors: [SELECTORS.homeBanner],
      context: HOME,
    });

    const raw = choices[0].variations[0].payload.data;
    expect(typeof raw).toBe('string');
    expect(asBannerPayload(choices[0].variations[0])).not.toBeNull();
  });

  it('lee los datos de producto del feed de DY, con sus nombres de campo', () => {
    const payload = asRecommendationPayload({
      id: 1,
      payload: {
        type: 'RECS',
        data: {
          slots: [
            {
              sku: 'SKU-9001',
              slotId: 'slot_a',
              productData: {
                name: 'Anorak Ventisca',
                // El feed usa snake_case, no camelCase.
                image_url: 'https://cdn.example.com/a.jpg',
                in_stock: false,
                brand: 'Cima',
                // Y puede mandar el precio como cadena.
                price: '149.95',
                categories: ['Abrigo'],
              },
            },
          ],
        },
      },
    });

    expect(payload?.slots[0]).toEqual({
      sku: 'SKU-9001',
      slotId: 'slot_a',
      name: 'Anorak Ventisca',
      price: 149.95,
      imageUrl: 'https://cdn.example.com/a.jpg',
      url: undefined,
      brand: 'Cima',
      inStock: false,
      categories: ['Abrigo'],
    });
  });

  it('acepta slots sin productData (respuesta con skusOnly)', () => {
    const payload = asRecommendationPayload({
      id: 1,
      payload: { type: 'RECS', data: { slots: [{ sku: 'SKU-1001' }] } },
    });

    expect(payload?.slots[0].sku).toBe('SKU-1001');
    expect(payload?.slots[0].name).toBeUndefined();
  });

  it('prioriza los datos de DY sobre el catálogo local y marca el origen', () => {
    const fromDy = toDisplayProduct({
      sku: 'SKU-1001',
      name: 'Nombre desde DY',
      price: 99,
    });
    expect(fromDy.name).toBe('Nombre desde DY');
    expect(fromDy.price).toBe(99);
    expect(fromDy.source).toBe('dy');

    // Sin productData, el catálogo local rellena los huecos.
    const fromCatalog = toDisplayProduct({ sku: 'SKU-1001' });
    expect(fromCatalog.name).toBe('Zapatilla Trail Alpina');
    expect(fromCatalog.source).toBe('catálogo');
  });

  it('muestra un SKU que DY recomienda pero la tienda no conoce', () => {
    const unknown = toDisplayProduct({ sku: 'SKU-DESCONOCIDO' });
    // Cae al SKU como nombre en vez de desaparecer del carrusel.
    expect(unknown.name).toBe('SKU-DESCONOCIDO');
    expect(unknown.inStock).toBe(true);
  });

  it('asigna ids de variación numéricos, como espera reportImpression', async () => {
    const client = createMockDyClient();
    await client.init(CONFIG);

    const { choices } = await client.choose({
      selectors: [SELECTORS.homeRecs],
      context: HOME,
    });

    expect(typeof choices[0].variations[0].id).toBe('number');
  });
});
