/**
 * Perfil de afinidad del usuario.
 *
 * Dos endpoints REST, fuera del SDK, según el modo activo:
 *
 * - `affinityProfile` → `rcom.dynamicyield.com/userAffinities`, client-side,
 *   por `uid` (el dyid) y sin api key. Es lo mismo que lee la web.
 * - `profileAnywhere` → `dy-api.com/v2/userprofile`, server-side, por
 *   `cuid` + `cuidType`, con su propia api key en la cabecera `dy-api-key`.
 *   Resuelve cross-canal por identidad.
 */

import { appConfig } from '../config/appConfig';
import type {
  AffinityDimension,
  AffinityProfile,
  AffinityValue,
} from '../models';
import type { AffinityMode } from './DyService';

export type AffinityResult =
  | { ok: true; profile: AffinityProfile }
  | { ok: false; error: string };

const RCOM_URL = 'https://rcom.dynamicyield.com/userAffinities';
const USER_PROFILE_URL = 'https://dy-api.com/v2/userprofile';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export interface AffinityRequest {
  mode: AffinityMode;
  cuid?: string;
  cuidType: string;
  dyid: string;
}

export const fetchAffinityProfile = (
  request: AffinityRequest,
): Promise<AffinityResult> =>
  request.mode === 'affinityProfile'
    ? fetchClientSideAffinity(request)
    : fetchProfileAnywhere(request);

/**
 * GET con reintentos ante 5xx transitorios del servidor (se ven 503 sueltos).
 * Un 4xx no se reintenta: no va a cambiar.
 */
const getWithRetries = async (
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> => {
  let attempt = 0;

  for (;;) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      const body = await response.text();

      if (
        response.status >= 500 &&
        response.status < 600 &&
        attempt < MAX_RETRIES
      ) {
        attempt += 1;
        await sleep(500 * attempt);
        continue;
      }
      return { status: response.status, body };
    } finally {
      clearTimeout(timeout);
    }
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Cache buster.
 *
 * Sin él la respuesta del dyid anterior se sirve cacheada después de
 * regenerar la identidad, y el perfil parece no haber cambiado.
 */
const cacheBuster = (): string => String(Date.now() / 1000);

const describeHttpError = (status: number, body: string): string =>
  `HTTP ${status}. ${body.trim() || 'Sin cuerpo.'}`;

const fetchClientSideAffinity = async (
  request: AffinityRequest,
): Promise<AffinityResult> => {
  // uid = la identidad "id" activa; si no hay, el dyid real que asignó DY.
  const uid = request.cuid ?? (request.dyid || undefined);
  if (!uid) {
    return {
      ok: false,
      error:
        'Aún no hay id disponible. Navega por la app (Home/Muse) para que Dynamic Yield asigne un dyid y vuelve a intentar.',
    };
  }

  const params = new URLSearchParams({
    limit: String(appConfig.affinityResultLimit),
    sec: appConfig.sectionId,
    uid,
    _: cacheBuster(),
  });

  try {
    const { status, body } = await getWithRetries(`${RCOM_URL}?${params}`, {
      accept: 'application/json',
    });
    if (status < 200 || status >= 300) {
      return { ok: false, error: describeHttpError(status, body) };
    }
    return {
      ok: true,
      profile: { cuid: uid, cuidType: 'id', dimensions: parseAffinity(body) },
    };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
};

const fetchProfileAnywhere = async (
  request: AffinityRequest,
): Promise<AffinityResult> => {
  // Si el campo está vacío y el tipo es "id", cae al dyid real del SDK.
  const id =
    request.cuid ??
    (request.cuidType === 'id' ? request.dyid || undefined : undefined);
  if (!id) {
    return {
      ok: false,
      error:
        'No hay identidad para Profile Anywhere. Ingresa un email o un dyid.',
    };
  }

  const params = new URLSearchParams({
    cuid: id,
    cuidType: request.cuidType,
    affinity: 'true',
    _: cacheBuster(),
  });

  try {
    const { status, body } = await getWithRetries(
      `${USER_PROFILE_URL}?${params}`,
      {
        accept: 'application/json',
        'dy-api-key': appConfig.profileAnywhereApiKey,
      },
    );
    if (status < 200 || status >= 300) {
      return { ok: false, error: describeHttpError(status, body) };
    }
    return {
      ok: true,
      profile: {
        cuid: id,
        cuidType: request.cuidType,
        dimensions: parseAffinity(body),
      },
    };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Parsea las dimensiones de afinidad.
 *
 * Las dimensiones son dinámicas (las define la sección), y cada una es un mapa
 * `{ valor: score }`. Los dos endpoints difieren en el envoltorio: `rcom`
 * devuelve las dimensiones planas y `/userprofile` las mete bajo `affinity`.
 */
export const parseAffinity = (body: string): AffinityDimension[] => {
  let root: unknown;
  try {
    root = JSON.parse(body);
  } catch {
    return [];
  }
  if (!root || typeof root !== 'object') {
    return [];
  }

  const record = root as Record<string, unknown>;
  const source =
    record.affinity && typeof record.affinity === 'object'
      ? (record.affinity as Record<string, unknown>)
      : record;

  return Object.entries(source)
    .map(([name, raw]): AffinityDimension | undefined => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return undefined;
      }
      const values: AffinityValue[] = Object.entries(
        raw as Record<string, unknown>,
      )
        .map(([valueName, scoreRaw]): AffinityValue | undefined => {
          const score =
            typeof scoreRaw === 'number'
              ? scoreRaw
              : typeof scoreRaw === 'string'
              ? Number(scoreRaw)
              : NaN;
          return Number.isFinite(score)
            ? { name: valueName, score }
            : undefined;
        })
        .filter((v): v is AffinityValue => !!v)
        .sort((a, b) => b.score - a.score);

      return values.length ? { name, values } : undefined;
    })
    .filter((d): d is AffinityDimension => !!d)
    .sort((a, b) => a.name.localeCompare(b.name));
};
