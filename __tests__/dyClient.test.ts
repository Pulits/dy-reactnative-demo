import { createMockDyClient, SELECTORS } from '../src/dy/mockClient';
import { asBannerPayload, asRecommendationPayload } from '../src/dy/payloads';
import type { DyConfig, DyPageContext } from '../src/dy/types';

const CONFIG: DyConfig = {
  apiKey: 'test-key',
  dataCenter: 'EU',
  consent: { granted: true },
  debug: false,
};

const HOME: DyPageContext = { type: 'HOMEPAGE', data: [], locale: 'es_ES' };
const PDP = (sku: string): DyPageContext => ({
  type: 'PRODUCT',
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
      name: 'Purchase',
      dyType: 'purchase-v1',
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
      id: 'v1',
      payload: { type: 'RECS_DATA', data: { slots: [{ sku: 'SKU-1001' }] } },
    });
    expect(payload).toEqual({ slots: [{ sku: 'SKU-1001' }] });
  });

  it('descarta slots sin sku utilizable', () => {
    const payload = asRecommendationPayload({
      id: 'v1',
      payload: {
        type: 'RECS_DATA',
        data: { slots: [{ sku: '' }, { sku: 42 }, null] },
      },
    });
    expect(payload).toBeNull();
  });

  it('devuelve null si la plantilla de la campaña cambia de forma', () => {
    expect(
      asRecommendationPayload({
        id: 'v1',
        payload: { type: 'RECS_DATA', data: { productos: ['SKU-1001'] } },
      }),
    ).toBeNull();
    expect(asRecommendationPayload(undefined)).toBeNull();
  });

  it('exige título y cuerpo en el banner, y deja el cta opcional', () => {
    expect(
      asBannerPayload({
        id: 'v1',
        payload: { type: 'CUSTOM_JSON', data: { title: 'Hola', body: 'Texto' } },
      }),
    ).toEqual({ title: 'Hola', body: 'Texto', cta: undefined });

    expect(
      asBannerPayload({
        id: 'v1',
        payload: { type: 'CUSTOM_JSON', data: { title: 'Solo título' } },
      }),
    ).toBeNull();
  });
});
