/**
 * Carga asíncrona con cancelación.
 *
 * Todas las pantallas piden datos a DY al montar y los recargan cuando cambia
 * el dyid. Sin el flag de cancelación, una respuesta lenta de una pantalla ya
 * desmontada dispararía un setState fuera de tiempo.
 */

import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  reload: () => void;
}

export const useAsync = <T>(
  load: () => Promise<T>,
  initial: T,
  deps: unknown[],
): AsyncState<T> => {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    load()
      .then(result => {
        if (!cancelled) {
          setData(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // `load` se recrearía en cada render; las dependencias reales las declara
    // quien llama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, reload };
};
