import { TurboModuleRegistry } from 'react-native';

import type { ObservableDyClient } from './DyClient';
import { createMockDyClient } from './mockClient';
import { hasRealApiKey } from './dyConfig';

/**
 * Decide qué adaptador usar.
 *
 * El SDK de DY es un TurboModule nativo: solo existe en un build real de
 * iOS/Android. En Jest, en Node o en un Metro sin build nativo, importarlo
 * revienta (`getEnforcing` lanza si el módulo no está registrado). Por eso se
 * comprueba primero con `TurboModuleRegistry.get`, que devuelve `null` en vez
 * de lanzar, y solo entonces se carga el adaptador nativo.
 *
 * Sin API key configurada también se cae al simulado: es preferible a que la
 * app falle al arrancar con un placeholder.
 */
export const isNativeSdkAvailable = (): boolean =>
  TurboModuleRegistry.get('DYPlugin') !== null;

export const createDyClient = (): ObservableDyClient => {
  if (!isNativeSdkAvailable() || !hasRealApiKey()) {
    return createMockDyClient();
  }

  // require() y no import: un import estático arrastraría el SDK al bundle de
  // los tests, donde el TurboModule no existe.
  const { createNativeDyClient } = require('./nativeClient') as typeof import('./nativeClient');
  return createNativeDyClient();
};

/** Qué adaptador está activo, para mostrarlo en el panel de depuración. */
export const activeClientKind = (): 'nativo' | 'simulado' =>
  isNativeSdkAvailable() && hasRealApiKey() ? 'nativo' : 'simulado';
