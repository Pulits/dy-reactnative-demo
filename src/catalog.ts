import type { DyProductData } from './dy';

/**
 * Catálogo local de la demo.
 *
 * Cuando DY devuelve recomendaciones con `skusOnly: false`, los datos de
 * producto (nombre, precio, imagen) vienen del feed de DY y este catálogo solo
 * actúa de respaldo. Con `skusOnly: true` DY devuelve solo el SKU y es la
 * tienda quien resuelve el resto — que es el papel que cumple aquí.
 */
export interface Product {
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl?: string;
  description: string;
  inStock: boolean;
}

export const CURRENCY = 'EUR';

export const CATALOG: Product[] = [
  {
    sku: 'SKU-1001',
    name: 'Zapatilla Trail Alpina',
    category: 'Calzado',
    brand: 'Sendero',
    price: 129.9,
    currency: CURRENCY,
    inStock: true,
    description:
      'Suela de agarre mixto para roca y barro, con drop de 8 mm y refuerzo en la puntera.',
  },
  {
    sku: 'SKU-1002',
    name: 'Chaqueta Cortavientos Nimbo',
    category: 'Abrigo',
    brand: 'Sendero',
    price: 89.0,
    currency: CURRENCY,
    inStock: true,
    description:
      'Tejido de 20 denieres plegable en su propio bolsillo. Costuras selladas.',
  },
  {
    sku: 'SKU-1003',
    name: 'Mochila Ligera 22L',
    category: 'Accesorios',
    brand: 'Cima',
    price: 74.5,
    currency: CURRENCY,
    inStock: true,
    description:
      'Espalda ventilada y compartimento para bolsa de hidratación de 2 L.',
  },
  {
    sku: 'SKU-1004',
    name: 'Camiseta Técnica Merino',
    category: 'Camisetas',
    brand: 'Sendero',
    price: 59.0,
    currency: CURRENCY,
    inStock: true,
    description:
      'Lana merina de 160 g/m², termorreguladora y sin costuras laterales.',
  },
  {
    sku: 'SKU-1005',
    name: 'Bastones Plegables Carbono',
    category: 'Accesorios',
    brand: 'Cima',
    price: 110.0,
    currency: CURRENCY,
    inStock: false,
    description:
      'Plegado en Z, 168 g por bastón, empuñadura de corcho natural.',
  },
  {
    sku: 'SKU-1006',
    name: 'Pantalón Convertible Sierra',
    category: 'Pantalones',
    brand: 'Sendero',
    price: 95.0,
    currency: CURRENCY,
    inStock: true,
    description:
      'Tejido elástico en cuatro direcciones con perneras desmontables por cremallera.',
  },
  {
    sku: 'SKU-1007',
    name: 'Frontal Recargable 400 lm',
    category: 'Accesorios',
    brand: 'Lumen',
    price: 45.0,
    currency: CURRENCY,
    inStock: true,
    description: 'Batería USB-C de 2000 mAh y modo rojo de visión nocturna.',
  },
  {
    sku: 'SKU-1008',
    name: 'Saco de Dormir Confort 0º',
    category: 'Acampada',
    brand: 'Cima',
    price: 165.0,
    currency: CURRENCY,
    inStock: true,
    description:
      'Relleno de plumón reciclado 650 cuin con cámara de aire diferencial.',
  },
];

export const bySku = (sku: string): Product | undefined =>
  CATALOG.find(product => product.sku === sku);

export const formatPrice = (value: number, currency = CURRENCY): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);

/**
 * Lo que las pantallas pintan: siempre tiene nombre y precio, vengan de DY o
 * del catálogo local.
 */
export interface DisplayProduct {
  sku: string;
  name: string;
  brand?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  inStock: boolean;
  /** De dónde salieron los datos, para mostrarlo en el panel de depuración. */
  source: 'dy' | 'catálogo';
}

/**
 * Fusiona un slot de DY con el catálogo local.
 *
 * DY manda cuando trae el dato; el catálogo rellena los huecos. Un SKU que DY
 * recomienda pero que la tienda no conoce se sigue mostrando: es preferible a
 * un carrusel con agujeros.
 */
export const toDisplayProduct = (slot: DyProductData): DisplayProduct => {
  const local = bySku(slot.sku);
  const fromDy = slot.name !== undefined || slot.price !== undefined;

  return {
    sku: slot.sku,
    name: slot.name ?? local?.name ?? slot.sku,
    brand: slot.brand ?? local?.brand,
    price: slot.price ?? local?.price,
    currency: local?.currency ?? CURRENCY,
    imageUrl: slot.imageUrl ?? local?.imageUrl,
    inStock: slot.inStock ?? local?.inStock ?? true,
    source: fromDy ? 'dy' : 'catálogo',
  };
};

export const productToDisplay = (product: Product): DisplayProduct => ({
  sku: product.sku,
  name: product.name,
  brand: product.brand,
  price: product.price,
  currency: product.currency,
  imageUrl: product.imageUrl,
  inStock: product.inStock,
  source: 'catálogo',
});
