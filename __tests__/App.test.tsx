/**
 * Test de humo de la app completa.
 *
 * Monta el árbol real —con sus providers, el adaptador simulado y las llamadas
 * a DY— y comprueba que el arranque llega hasta el contenido. Es lo que
 * detecta que un provider falta o que una pantalla revienta al montar, cosa
 * que los tests de la capa DY no ven.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';
import { AppShell } from '../src/navigation/AppShell';
import { DyProvider } from '../src/dy/DyProvider';
import { NavigationProvider } from '../src/navigation/NavigationContext';
import { CartProvider } from '../src/state/CartContext';
import { WishlistProvider } from '../src/state/WishlistContext';

/** Todos los textos del árbol renderizado. */
const textsOf = (tree: ReactTestRenderer.ReactTestRenderer): string[] =>
  tree.root
    .findAllByType('Text' as unknown as React.ComponentType)
    .flatMap(node => node.children)
    .filter((child): child is string => typeof child === 'string');

describe('App', () => {
  it('arranca en el splash', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<App />);
    });

    expect(textsOf(tree)).toContain('Blueberry');

    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });
  });

  it('monta el armazón sin reventar y llega al login de identidad', async () => {
    jest.useFakeTimers();

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <DyProvider>
          <CartProvider>
            <WishlistProvider>
              <NavigationProvider>
                <AppShell />
              </NavigationProvider>
            </WishlistProvider>
          </CartProvider>
        </DyProvider>,
      );
    });

    // El splash se retira solo tras su temporizador.
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1500);
    });

    const texts = textsOf(tree);
    expect(texts).toContain("Who's shopping?");
    // Los dos modos de perfil que ofrece la app de iOS.
    expect(texts).toContain('Profile Anywhere');
    expect(texts).toContain('Affinity Profile');

    await ReactTestRenderer.act(async () => {
      tree.unmount();
    });

    jest.useRealTimers();
  });
});
