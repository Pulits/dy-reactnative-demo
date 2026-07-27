import type { DyConfig } from './types';

/**
 * Configuración de la sección de Dynamic Yield.
 *
 * IMPORTANTE — usa siempre la API key **client-side** de tu sección móvil
 * (Consola de DY › Setup › API Keys › Mobile App). Nunca una clave server-side:
 * todo lo que se compila en la app es extraíble del APK/IPA, y una clave
 * server-side tiene privilegios que no deben salir de tu backend.
 *
 * Este fichero se commitea con un placeholder a propósito. Para trabajar en
 * local, sustituye el valor y evita subir el cambio:
 *
 *   git update-index --skip-worktree src/dy/dyConfig.ts
 *
 * En CI/producción, inyéctala en tiempo de build (react-native-config,
 * variantes de Gradle, xcconfig...) en vez de dejarla escrita aquí.
 */
export const DY_API_KEY = 'REPLACE_WITH_YOUR_DY_CLIENT_SIDE_API_KEY';

export const hasRealApiKey = (): boolean =>
  DY_API_KEY.length > 0 && !DY_API_KEY.startsWith('REPLACE_WITH_');

/** React Native no trae los tipos de Node; solo se necesita esta parte. */
declare const process: { env: { NODE_ENV?: string } };

export const DY_CONFIG: DyConfig = {
  apiKey: DY_API_KEY,
  // 'EU' si tu sección vive en el data center europeo.
  dataCenter: 'EU',
  locale: 'es_ES',
  // DY no persiste el consentimiento entre lanzamientos: hay que pasarlo siempre.
  consent: { granted: true },
  // En test se silencia: el volcado por consola domina el tiempo de ejecución.
  debug: __DEV__ && process.env.NODE_ENV !== 'test',
};
