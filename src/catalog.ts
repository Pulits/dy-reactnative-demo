/**
 * Catálogo local de la demo.
 *
 * En una integración real los productos vienen del backend de la tienda y DY
 * solo devuelve SKUs; aquí el catálogo es local para que la app arranque sin
 * dependencias externas. `sku` es la clave que se cruza con lo que devuelve DY.
 */
export interface Product {
  sku: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  color: string;
  description: string;
}

export const CURRENCY = 'EUR';

export const CATALOG: Product[] = [
  {
    sku: 'SKU-1001',
    name: 'Zapatilla Trail Alpina',
    category: 'Calzado',
    price: 129.9,
    currency: CURRENCY,
    color: '#2F6F4E',
    description:
      'Suela de agarre mixto para roca y barro, con drop de 8 mm y refuerzo en la puntera.',
  },
  {
    sku: 'SKU-1002',
    name: 'Chaqueta Cortavientos Nimbo',
    category: 'Abrigo',
    price: 89.0,
    currency: CURRENCY,
    color: '#31527A',
    description:
      'Tejido de 20 denieres plegable en su propio bolsillo. Costuras selladas.',
  },
  {
    sku: 'SKU-1003',
    name: 'Mochila Ligera 22L',
    category: 'Accesorios',
    price: 74.5,
    currency: CURRENCY,
    color: '#8A5A2B',
    description:
      'Espalda ventilada y compartimento para bolsa de hidratación de 2 L.',
  },
  {
    sku: 'SKU-1004',
    name: 'Camiseta Técnica Merino',
    category: 'Camisetas',
    price: 59.0,
    currency: CURRENCY,
    color: '#6B4E71',
    description:
      'Lana merina de 160 g/m², termorreguladora y sin costuras laterales.',
  },
  {
    sku: 'SKU-1005',
    name: 'Bastones Plegables Carbono',
    category: 'Accesorios',
    price: 110.0,
    currency: CURRENCY,
    color: '#3F6E7D',
    description:
      'Plegado en Z, 168 g por bastón, empuñadura de corcho natural.',
  },
  {
    sku: 'SKU-1006',
    name: 'Pantalón Convertible Sierra',
    category: 'Pantalones',
    price: 95.0,
    currency: CURRENCY,
    color: '#7A6B31',
    description:
      'Tejido elástico en cuatro direcciones con perneras desmontables por cremallera.',
  },
  {
    sku: 'SKU-1007',
    name: 'Frontal Recargable 400 lm',
    category: 'Accesorios',
    price: 45.0,
    currency: CURRENCY,
    color: '#A84E32',
    description: 'Batería USB-C de 2000 mAh y modo rojo de visión nocturna.',
  },
  {
    sku: 'SKU-1008',
    name: 'Saco de Dormir Confort 0º',
    category: 'Acampada',
    price: 165.0,
    currency: CURRENCY,
    color: '#4A4A6A',
    description:
      'Relleno de plumón reciclado 650 cuin con cámara de aire diferencial.',
  },
];

export const bySku = (sku: string): Product | undefined =>
  CATALOG.find(product => product.sku === sku);

export const formatPrice = (value: number, currency = CURRENCY): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value);
