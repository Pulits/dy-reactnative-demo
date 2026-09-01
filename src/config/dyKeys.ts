/**
 * Credenciales de Dynamic Yield.
 *
 * ⚠️ Este fichero se commitea **con placeholders** y este repositorio es
 * público. Estas claves dan acceso a los datos de la sección, así que al poner
 * las reales hay que evitar que salgan en un commit:
 *
 *   git update-index --skip-worktree src/config/dyKeys.ts
 *
 * (para deshacerlo: `git update-index --no-skip-worktree src/config/dyKeys.ts`)
 *
 * Va commiteado en vez de ignorado a propósito: Metro resuelve los imports en
 * tiempo de empaquetado, así que un fichero ausente en un clon recién hecho
 * rompería el bundle en vez de degradar.
 *
 * En CI/producción inyéctalas en tiempo de build (react-native-config, variantes
 * de Gradle, xcconfig) en vez de dejarlas escritas aquí.
 */

/** API key con la que se inicializa el SDK. */
export const DY_API_KEY = 'REPLACE_WITH_YOUR_DY_API_KEY';

/**
 * API key dedicada del endpoint `/userprofile` (Profile Anywhere). Es distinta
 * de la general y viaja en la cabecera `dy-api-key`.
 */
export const DY_PROFILE_ANYWHERE_API_KEY =
  'REPLACE_WITH_YOUR_PROFILE_ANYWHERE_API_KEY';

/** Section ID de la sección (param `sec` del endpoint rcom de afinidades). */
export const DY_SECTION_ID = 'REPLACE_WITH_YOUR_SECTION_ID';

/** Data center de la sección. */
export const DY_DATA_CENTER: 'US' | 'EU' = 'US';

/** `false` mientras alguna clave siga siendo el placeholder. */
export const hasRealKeys = (): boolean =>
  !DY_API_KEY.startsWith('REPLACE_WITH_');
