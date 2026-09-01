/**
 * Elige adaptador en tiempo de ejecución.
 *
 * El SDK es un TurboModule nativo: solo existe en un build real de iOS o
 * Android. En Jest, en Node o en un Metro sin build nativo no está, y
 * `getEnforcing` lanzaría al importarlo. Por eso se comprueba antes con
 * `TurboModuleRegistry.get`, que devuelve `null` en vez de lanzar, y solo
 * entonces se carga `nativeClient` con un `require`.
 *
 * Este fichero **no** se reexporta desde `index.ts` a propósito: un import
 * estático arrastraría el adaptador nativo al bundle de los tests.
 */

import { TurboModuleRegistry } from 'react-native';

import { appConfig, isDynamicYieldConfigured } from '../config/appConfig';
import type { DyClient } from './DyClient';
import { createMockClient } from './mockClient';

/** Nombre del TurboModule que expone el SDK. */
const DY_TURBO_MODULE = 'DYPlugin';

export interface ClientChoice {
  client: DyClient;
  kind: 'native' | 'mock';
  /** Por qué se eligió, para mostrarlo en el panel de depuración. */
  reason: string;
}

export const createDyClient = (): ClientChoice => {
  if (!isDynamicYieldConfigured()) {
    return {
      client: createMockClient(),
      kind: 'mock',
      reason: 'Sin API key: pon la tuya en src/config/dyKeys.ts',
    };
  }

  if (!appConfig.enableDyRecommendations) {
    return {
      client: createMockClient(),
      kind: 'mock',
      reason: 'Recomendaciones de DY desactivadas en appConfig',
    };
  }

  if (!TurboModuleRegistry.get(DY_TURBO_MODULE)) {
    return {
      client: createMockClient(),
      kind: 'mock',
      reason: 'SDK nativo ausente: hace falta un build de iOS o Android',
    };
  }

  // require, no import: un import estático metería el SDK en el bundle de test.
  const { createNativeClient } = require('./nativeClient') as {
    createNativeClient: () => DyClient;
  };

  return {
    client: createNativeClient(),
    kind: 'native',
    reason: 'SDK nativo disponible',
  };
};
