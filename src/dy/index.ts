/**
 * Punto de entrada de la capa de Dynamic Yield.
 *
 * `createClient` queda fuera a propósito: reexportarlo haría que un import
 * estático arrastrase el adaptador nativo al bundle de los tests.
 */

export * from './types';
export * from './parse';
export * from './affinity';
export type { DyClient } from './DyClient';
export { DyService, affinityModeTitle, createMemoryStorage } from './DyService';
export type { AffinityMode, DyState, DyStorage } from './DyService';
export { createMockClient } from './mockClient';
