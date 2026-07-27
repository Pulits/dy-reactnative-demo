/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';

test('monta la app y resuelve las campañas de la home', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  // Un segundo tick: init() marca `ready`, y solo entonces se lanzan los
  // `choose` de la home. Sin esto el árbol se comprueba a medio cargar.
  await ReactTestRenderer.act(async () => {});

  const texts = tree!.root
    .findAllByType('Text' as unknown as React.ElementType)
    .flatMap(node => node.children)
    .filter((child): child is string => typeof child === 'string');

  expect(texts).toContain('Recomendado para ti');
  expect(texts).toContain('Todo el catálogo');

  ReactTestRenderer.act(() => tree!.unmount());
});
