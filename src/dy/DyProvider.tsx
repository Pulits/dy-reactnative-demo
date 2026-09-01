/**
 * Contexto de Dynamic Yield.
 *
 * Crea el servicio una sola vez, lo inicializa al montar y expone el estado
 * observable a las pantallas. El equivalente del singleton `@MainActor` de la
 * app de iOS.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import { createDyClient } from './createClient';
import { DyService } from './DyService';
import type { DyState } from './DyService';

interface DyContextValue {
  dy: DyService;
  /** Qué adaptador está activo y por qué; se muestra en el panel de debug. */
  clientKind: 'native' | 'mock';
  clientReason: string;
}

const DyContext = createContext<DyContextValue | undefined>(undefined);

export const DyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useMemo<DyContextValue>(() => {
    const { client, kind, reason } = createDyClient();
    return {
      dy: new DyService(client),
      clientKind: kind,
      clientReason: reason,
    };
  }, []);

  const started = useRef(false);

  useEffect(() => {
    // En StrictMode el efecto corre dos veces; initialize() es idempotente,
    // pero evitamos siquiera la segunda llamada.
    if (started.current) {
      return;
    }
    started.current = true;
    void value.dy.initialize();
  }, [value]);

  return <DyContext.Provider value={value}>{children}</DyContext.Provider>;
};

const useDyContext = (): DyContextValue => {
  const context = useContext(DyContext);
  if (!context) {
    throw new Error('useDy debe usarse dentro de <DyProvider>.');
  }
  return context;
};

/** El servicio, para lanzar llamadas. No re-renderiza al cambiar el estado. */
export const useDy = (): DyService => useDyContext().dy;

/** Qué adaptador está activo. */
export const useDyClientInfo = (): {
  kind: 'native' | 'mock';
  reason: string;
} => {
  const { clientKind, clientReason } = useDyContext();
  return { kind: clientKind, reason: clientReason };
};

/** El estado observable del servicio; re-renderiza cuando cambia. */
export const useDyState = (): DyState => {
  const { dy } = useDyContext();
  return useSyncExternalStore(dy.subscribe, dy.getState, dy.getState);
};
