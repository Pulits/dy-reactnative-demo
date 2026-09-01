/**
 * Tests de la capa de Dynamic Yield.
 *
 * Corren contra el adaptador simulado, que devuelve respuestas con la misma
 * forma que el SDK real: `custom` como cadena JSON sin parsear, ids de
 * variación numéricos y precios que a veces llegan como cadena. Así lo que se
 * ejercita es el parseo de verdad, no una versión ya masticada.
 */

import { appConfig } from '../src/config/appConfig';
import { CATALOG } from '../src/catalog';
import { DyService, createMockClient } from '../src/dy';
import {
  htmlToPlainText,
  parseAffinity,
  parseInfoAttributes,
  parseProduct,
  parseRecsHeader,
  prettifyAttributeKey,
} from '../src/dy';

const newService = async (): Promise<DyService> => {
  const service = new DyService(createMockClient());
  await service.initialize();
  return service;
};

describe('parseProduct', () => {
  const slot = {
    slotId: 'slot-1',
    productData: {
      groupId: '1626678952045',
      name: 'Silk Slip Midi Dress',
      price: 189,
      imageUrl: 'https://example.test/dress.jpg',
      categories: ['Women'],
      inStock: true,
      extra: { sku: 'wd01' },
    },
  };

  it('mapea el producto y arrastra la metadata de engagement', () => {
    const product = parseProduct(slot, {
      decisionId: 'decision-1',
      variationId: 101,
    });

    expect(product).toMatchObject({
      id: '1626678952045',
      sku: 'wd01',
      name: 'Silk Slip Midi Dress',
      price: 189,
      category: 'Women',
      slotId: 'slot-1',
      decisionId: 'decision-1',
      variationId: 101,
    });
  });

  it('acepta el precio como cadena, que es como lo manda a veces el feed', () => {
    const product = parseProduct({
      ...slot,
      productData: { ...slot.productData, price: '189.50' },
    });
    expect(product?.price).toBe(189.5);
  });

  it('cae al group_id cuando el feed no trae sku', () => {
    const product = parseProduct({
      ...slot,
      productData: { ...slot.productData, extra: {} },
    });
    expect(product?.sku).toBe('1626678952045');
  });

  it('descarta el slot si falta un campo sin el que no se puede pintar', () => {
    expect(
      parseProduct({
        ...slot,
        productData: { ...slot.productData, name: undefined },
      }),
    ).toBeUndefined();

    expect(
      parseProduct({
        ...slot,
        productData: { ...slot.productData, price: 'no es un número' },
      }),
    ).toBeUndefined();
  });

  it('usa la categoría de respaldo cuando el feed no la trae', () => {
    const product = parseProduct(
      { ...slot, productData: { ...slot.productData, categories: [] } },
      { fallbackCategory: 'Beauty' },
    );
    expect(product?.category).toBe('Beauty');
  });
});

describe('parseRecsHeader', () => {
  it('lee title y subtitle del custom, que llega sin parsear', () => {
    expect(
      parseRecsHeader('{"title":"Para ti","subtitle":"Por tu actividad"}'),
    ).toEqual({ title: 'Para ti', subtitle: 'Por tu actividad' });
  });

  it('no revienta con un custom vacío o que no es JSON', () => {
    expect(parseRecsHeader('')).toEqual({});
    expect(parseRecsHeader('no soy json')).toEqual({});
    expect(parseRecsHeader(undefined)).toEqual({});
  });
});

describe('htmlToPlainText', () => {
  it('quita los tags y decodifica entidades', () => {
    expect(htmlToPlainText('<p>Bolsos &amp; carteras</p>')).toBe(
      'Bolsos & carteras',
    );
  });

  it('convierte los saltos de bloque en saltos de línea', () => {
    expect(htmlToPlainText('<p>Una</p><p>Dos</p>')).toBe('Una\nDos');
    expect(htmlToPlainText('Una<br>Dos')).toBe('Una\nDos');
  });
});

describe('atributos de información del producto', () => {
  it('convierte la key del feed en un título legible', () => {
    expect(prettifyAttributeKey('size_and_fit')).toBe('Size And Fit');
    expect(prettifyAttributeKey('deliveryAndReturns')).toBe(
      'Delivery And Returns',
    );
  });

  it('solo recoge campos de info, y los ordena por prioridad', () => {
    const attributes = parseInfoAttributes({
      delivery_and_returns: 'Free delivery over $50.',
      size_and_fit: 'True to size.',
      description: 'No debería aparecer: se pinta aparte.',
      random_field: 'Tampoco: no es un campo de info.',
      details: '<b>Detalles</b> del producto.',
    });

    expect(attributes.map(a => a.title)).toEqual([
      'Details',
      'Size And Fit',
      'Delivery And Returns',
    ]);
    // El HTML del feed llega limpio.
    expect(attributes[0].value).toBe('Detalles del producto.');
  });
});

describe('parseAffinity', () => {
  it('lee las dimensiones planas de rcom', () => {
    const dimensions = parseAffinity(
      '{"categories":{"Women":0.9,"Men":0.2},"brands":{"Acme":0.5}}',
    );
    expect(dimensions.map(d => d.name)).toEqual(['brands', 'categories']);
    expect(dimensions[1].values).toEqual([
      { name: 'Women', score: 0.9 },
      { name: 'Men', score: 0.2 },
    ]);
  });

  it('desenvuelve el objeto affinity de /userprofile', () => {
    const dimensions = parseAffinity('{"affinity":{"categories":{"Men":0.7}}}');
    expect(dimensions).toEqual([
      { name: 'categories', values: [{ name: 'Men', score: 0.7 }] },
    ]);
  });

  it('acepta scores como cadena y descarta lo que no es numérico', () => {
    const dimensions = parseAffinity(
      '{"categories":{"Men":"0.7","Kids":"nada"}}',
    );
    expect(dimensions[0].values).toEqual([{ name: 'Men', score: 0.7 }]);
  });

  it('devuelve vacío si el cuerpo no es JSON', () => {
    expect(parseAffinity('<html>error</html>')).toEqual([]);
  });
});

describe('DyService', () => {
  it('asigna dyid y sesión en el primer choose, como hace el servidor', async () => {
    const service = await newService();
    await service.getRecommendations();
    expect(service.getState().dyid).not.toBe('');
  });

  it('trae las recomendaciones del home con su encabezado', async () => {
    const service = await newService();
    const recs = await service.getRecommendations();

    expect(recs.title).toBe('Recommended for you');
    expect(recs.products.length).toBeGreaterThan(0);
    expect(recs.products[0].slotId).toBeDefined();
  });

  it('excluye el producto actual de los similares del PDP', async () => {
    const service = await newService();
    const target = CATALOG[0];
    const recs = await service.getPdpRecommendations(target.id, target.sku);

    expect(recs.products.map(p => p.id)).not.toContain(target.id);
  });

  it('excluye del carrusel del carrito lo que ya está dentro', async () => {
    const service = await newService();
    const inCart = CATALOG[0].sku!;
    const recs = await service.getCartRecommendations([inCart]);

    expect(recs.products.map(p => p.sku)).not.toContain(inCart);
  });

  it('no llama a DY para las recomendaciones de un carrito vacío', async () => {
    const service = await newService();
    expect((await service.getCartRecommendations([])).products).toEqual([]);
  });

  it('parsea el hero banner, que llega como CUSTOM_JSON sin parsear', async () => {
    const service = await newService();
    const hero = await service.getHeroBanner();

    expect(hero).toMatchObject({
      title: 'New Season Collection',
      ctaText: 'Shop Women',
      categoryName: 'Women',
    });
  });

  it('acepta el performance del social proof como número', async () => {
    const service = await newService();
    const proof = await service.getSocialProof('1626678952045', 'wd01');

    expect(proof).toMatchObject({
      highlightedText: 'Going fast!',
      performance: '47',
    });
  });

  it('devuelve undefined cuando la campaña no aplica (NO_DECISION)', async () => {
    const service = await newService();
    expect(await service.getBanner('Campaña Que No Existe')).toBeUndefined();
  });

  it('lee la config de Muse del custom de la campaña', async () => {
    const service = await newService();
    const home = await service.museHome();

    expect(home.assistantName).toBe('Blueberry Muse');
    expect(home.suggestions).toHaveLength(4);
    expect(home.products.length).toBeGreaterThan(0);
  });

  it('limpia el HTML de la respuesta del asistente y mantiene el hilo', async () => {
    const service = await newService();
    const first = await service.museChat('vestidos de fiesta');

    expect(first.text).toBe('Here are a few looks for vestidos de fiesta.');
    expect(first.galleries.length).toBeGreaterThan(0);
    expect(first.chatId).toBeDefined();

    const second = await service.museChat('algo más corto', first.chatId);
    expect(second.chatId).toBe(first.chatId);
  });

  it('marca como support las preguntas de atención al cliente', async () => {
    const service = await newService();
    const reply = await service.museChat('what is your return policy?');

    expect(reply.isSupport).toBe(true);
    expect(reply.galleries).toEqual([]);
  });

  it('inyecta el SKU en el prompt de Complete the Look', async () => {
    const service = await newService();
    const reply = await service.completeTheLook(CATALOG[0]);
    expect(reply.galleries.length).toBeGreaterThan(0);
  });

  it('propone corrección solo si difiere de lo escrito', async () => {
    const service = await newService();

    const hit = await service.semanticSearch('Women');
    expect(hit.correctedQuery).toBeUndefined();

    const miss = await service.semanticSearch('vestidoo');
    expect(miss.correctedQuery).toBe('dress');
  });

  it('no busca con la cadena vacía', async () => {
    const service = await newService();
    expect(await service.semanticSearch('   ')).toEqual({
      query: '',
      total: 0,
      products: [],
    });
  });

  it('manda el nombre de la categoría como custom attribute', async () => {
    const client = createMockClient();
    const spy = jest.spyOn(client, 'chooseVariations');
    const service = new DyService(client);
    await service.initialize();

    await service.getCategoryRecs(
      'Women',
      appConfig.selectors.mostPopularInCategory,
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        pageAttributes: { [appConfig.categoryFilterAttribute]: 'Women' },
      }),
    );
  });

  it('solo identifica al usuario cuando el cuidType es email', async () => {
    const client = createMockClient();
    const spy = jest.spyOn(client, 'chooseVariations');
    const service = new DyService(client);
    await service.initialize();

    // Un dyid va anónimo: si se mandara como cuid, DY atribuiría el
    // comportamiento a un perfil identificado y rompería las afinidades.
    service.setIdentity('affinityProfile', 'id', 'algún-dyid');
    await service.getRecommendations();
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ identity: undefined }),
    );

    service.setIdentity('profileAnywhere', 'email', 'alguien@example.test');
    await service.getRecommendations();
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identity: { cuid: 'alguien@example.test', cuidType: 'email' },
      }),
    );
  });

  it('registra la actividad y lleva los contadores', async () => {
    const service = await newService();

    await service.reportPageView('home');
    await service.reportAddToCart(CATALOG[0], 2);
    await service.reportRecommendationImpressions([
      { ...CATALOG[0], slotId: 'slot-1', variationId: 101 },
    ]);

    const state = service.getState();
    expect(state.pageViewCount).toBe(1);
    expect(state.eventCount).toBe(1);
    expect(state.engagementCount).toBe(1);
    expect(service.activityEntries('event')[0].title).toBe('Add to Cart');
  });

  it('el pageview de producto también apunta al histórico de vistos', async () => {
    const service = await newService();
    await service.reportProductView(CATALOG[0]);

    expect(service.getState().recentlyViewed[0].id).toBe(CATALOG[0].id);
    // Reporta el pageview y, además, el evento custom "Recently Viewed".
    expect(service.getState().eventCount).toBe(1);
  });

  it('no duplica en vistos recientemente y pone el último primero', async () => {
    const service = await newService();
    await service.reportProductView(CATALOG[0]);
    await service.reportProductView(CATALOG[1]);
    await service.reportProductView(CATALOG[0]);

    const viewed = service.getState().recentlyViewed;
    expect(viewed.map(p => p.id)).toEqual([CATALOG[0].id, CATALOG[1].id]);
  });

  it('regenera el dyid con un choose, no con un pageview', async () => {
    const service = await newService();
    await service.getRecommendations();
    const before = service.getState().dyid;

    const after = await service.regenerateDyid();

    expect(after).not.toBe(before);
    expect(after).not.toBe('');
    expect(service.getState().dyidResetCounter).toBe(1);
    // El estado local se limpia para que parezca un usuario nuevo.
    expect(service.getState().activityLog).toEqual([]);
  });

  it('reporta SLOT_CLICK con slot y CLICK sin él', async () => {
    const client = createMockClient();
    const slotClick = jest.spyOn(client, 'reportSlotClick');
    const click = jest.spyOn(client, 'reportClick');
    const service = new DyService(client);
    await service.initialize();

    await service.reportRecommendationClick({
      ...CATALOG[0],
      slotId: 'slot-1',
      variationId: 101,
    });
    expect(slotClick).toHaveBeenCalledTimes(1);

    await service.reportRecommendationClick({
      ...CATALOG[0],
      slotId: undefined,
      decisionId: 'decision-1',
    });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('no reporta impresiones si ningún producto trae slot', async () => {
    const client = createMockClient();
    const spy = jest.spyOn(client, 'reportSlotsImpression');
    const service = new DyService(client);
    await service.initialize();

    await service.reportRecommendationImpressions([CATALOG[0]]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('ordena las categorías por afinidad y respeta el orden default en empate', async () => {
    const service = await newService();
    jest.spyOn(service, 'fetchAffinityProfile').mockResolvedValue({
      ok: true,
      profile: {
        cuid: 'x',
        cuidType: 'id',
        dimensions: [
          {
            name: 'categories',
            values: [
              { name: 'Women', score: 0.9 },
              { name: 'Men', score: 0.4 },
            ],
          },
        ],
      },
    });

    expect(await service.categoryAffinityOrder()).toEqual([
      'Women',
      'Men',
      'Kids',
      'Home',
      'Beauty',
    ]);
  });

  it('cae al orden default cuando la afinidad está toda a cero', async () => {
    const service = await newService();
    jest.spyOn(service, 'fetchAffinityProfile').mockResolvedValue({
      ok: true,
      profile: {
        cuid: 'x',
        cuidType: 'id',
        dimensions: [
          { name: 'categories', values: [{ name: 'Women', score: 0 }] },
        ],
      },
    });

    expect(await service.categoryAffinityOrder()).toBeUndefined();
  });
});
