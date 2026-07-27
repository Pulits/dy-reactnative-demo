import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { DyLogEntry, ObservableDyClient } from './DyClient';
import { createMockDyClient } from './mockClient';
import { DY_CONFIG } from './dyConfig';
import type {
  DyChoice,
  DyEngagement,
  DyEvent,
  DyPageContext,
} from './types';

interface DyContextValue {
  client: ObservableDyClient;
  ready: boolean;
  consent: boolean;
  setConsent: (granted: boolean) => void;
  log: DyLogEntry[];
  clearLog: () => void;
}

const DyContext = createContext<DyContextValue | null>(null);

export const DyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // El cliente se crea una vez y sobrevive a los re-renders.
  const clientRef = useRef<ObservableDyClient>();
  if (!clientRef.current) {
    clientRef.current = createMockDyClient();
  }
  const client = clientRef.current;

  const [ready, setReady] = useState(false);
  const [consent, setConsentState] = useState(DY_CONFIG.consent.granted);
  const [log, setLog] = useState<DyLogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    client
      .init(DY_CONFIG)
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((error: unknown) => {
        console.error('[dy] init falló', error);
      });

    const unsubscribe = client.subscribe(setLog);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [client]);

  const setConsent = useCallback(
    (granted: boolean) => {
      setConsentState(granted);
      client.setConsent(granted).catch((error: unknown) => {
        console.error('[dy] setConsent falló', error);
      });
    },
    [client],
  );

  const clearLog = useCallback(() => client.clearLog(), [client]);

  const value = useMemo<DyContextValue>(
    () => ({ client, ready, consent, setConsent, log, clearLog }),
    [client, ready, consent, setConsent, log, clearLog],
  );

  return <DyContext.Provider value={value}>{children}</DyContext.Provider>;
};

export const useDy = (): DyContextValue => {
  const value = useContext(DyContext);
  if (!value) {
    throw new Error('useDy debe usarse dentro de <DyProvider>.');
  }
  return value;
};

/** Reporta un pageview cada vez que cambia el contexto de pantalla. */
export const usePageView = (context: DyPageContext): void => {
  const { client, ready } = useDy();
  const key = `${context.type}|${context.data.join(',')}|${context.locale}`;

  useEffect(() => {
    if (!ready) {
      return;
    }
    client.pageView(context).catch((error: unknown) => {
      console.error('[dy] pageView falló', error);
    });
    // `key` resume el contexto: evita re-disparar por identidad del objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ready, key]);
};

interface ChooseState {
  choices: DyChoice[];
  loading: boolean;
  error: Error | null;
}

/**
 * Resuelve campañas para la pantalla actual.
 *
 * Reporta la impresión automáticamente al recibir las variaciones, que es lo que
 * DY espera para atribuir el engagement. Si una campaña se renderiza fuera de la
 * vista (p.ej. un carrusel por debajo del scroll), pasa `autoImpression: false` y
 * llama a `reportImpression` cuando de verdad se vea.
 */
export const useChoose = (
  selectors: string[],
  context: DyPageContext,
  options: { implicitPageview?: boolean; autoImpression?: boolean } = {},
): ChooseState & {
  reportImpression: (choice: DyChoice) => void;
  reportClick: (choice: DyChoice) => void;
} => {
  const { client, ready } = useDy();
  const { implicitPageview = false, autoImpression = true } = options;

  const [state, setState] = useState<ChooseState>({
    choices: [],
    loading: true,
    error: null,
  });

  const selectorKey = selectors.join('|');
  const contextKey = `${context.type}|${context.data.join(',')}|${context.locale}`;

  const report = useCallback(
    (type: DyEngagement['type'], choice: DyChoice) => {
      client
        .reportEngagement({
          type,
          decisionId: choice.decisionId,
          variationIds: choice.variations.map(variation => variation.id),
        })
        .catch((error: unknown) => {
          console.error('[dy] reportEngagement falló', error);
        });
    },
    [client],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;
    setState(current => ({ ...current, loading: true, error: null }));

    client
      .choose({ selectors, context, implicitPageview })
      .then(result => {
        if (cancelled) {
          return;
        }
        setState({ choices: result.choices, loading: false, error: null });
        if (autoImpression) {
          result.choices.forEach(choice => report('IMPRESSION', choice));
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setState({
          choices: [],
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, ready, selectorKey, contextKey, implicitPageview, autoImpression, report]);

  return {
    ...state,
    reportImpression: useCallback(
      (choice: DyChoice) => report('IMPRESSION', choice),
      [report],
    ),
    reportClick: useCallback(
      (choice: DyChoice) => report('CLICK', choice),
      [report],
    ),
  };
};

/** Envía un evento de negocio a DY. */
export const useTrackEvent = (): ((event: DyEvent) => void) => {
  const { client } = useDy();
  return useCallback(
    (event: DyEvent) => {
      client.trackEvent(event).catch((error: unknown) => {
        console.error('[dy] trackEvent falló', error);
      });
    },
    [client],
  );
};
