import type {
  DyChooseRequest,
  DyChooseResult,
  DyConfig,
  DyEngagement,
  DyEvent,
  DyIdentity,
  DyPageContext,
  DyRolloutFlag,
} from './types';

/**
 * Contrato único contra el que programan las pantallas.
 *
 * Existe para que la app no dependa directamente de
 * `@dynamicyield/react-native-sdk`: hoy corre sobre `createMockDyClient`, y el
 * día que el paquete esté instalado basta con añadir un adaptador que implemente
 * esta interfaz y cambiarlo en `src/dy/index.ts`. Las pantallas no se tocan.
 *
 * El orden de llamadas en una integración típica es:
 *   init -> pageView (o choose con implicitPageview) -> reportEngagement -> trackEvent
 */
export interface DyClient {
  /** Arranca el SDK. Debe llamarse una sola vez, antes que cualquier otro método. */
  init(config: DyConfig): Promise<void>;

  /**
   * Actualiza el consentimiento en caliente. Solo aplica a la sesión actual:
   * DY no lo persiste, hay que volver a pasarlo en cada arranque de la app.
   */
  setConsent(granted: boolean): Promise<void>;

  /** Identificadores actuales de usuario y sesión. Útil para depurar. */
  getIdentity(): DyIdentity;

  /** Reporta la visualización de una pantalla. */
  pageView(context: DyPageContext): Promise<void>;

  /** Resuelve una o varias campañas para el usuario actual. */
  choose(request: DyChooseRequest): Promise<DyChooseResult>;

  /**
   * Reporta impresión o click sobre una variación servida. Sin esto DY no puede
   * atribuir el engagement y las métricas de la campaña quedan vacías.
   */
  reportEngagement(engagement: DyEngagement): Promise<void>;

  /** Reporta un evento de negocio (add to cart, compra, o uno custom). */
  trackEvent(event: DyEvent): Promise<void>;

  /** Lee el flag de una campaña de Rollout. */
  getRolloutFlag(selector: string): Promise<DyRolloutFlag>;
}

/**
 * Entrada del registro de actividad. No forma parte de la integración con DY:
 * alimenta el panel de depuración de la demo para poder ver qué se enviaría.
 */
export interface DyLogEntry {
  id: number;
  at: number;
  kind: 'init' | 'consent' | 'pageview' | 'choose' | 'engagement' | 'event';
  summary: string;
  detail: unknown;
}

export type DyLogListener = (entries: DyLogEntry[]) => void;

/** Cliente instrumentado que además expone lo que ha ido enviando. */
export interface ObservableDyClient extends DyClient {
  getLog(): DyLogEntry[];
  subscribe(listener: DyLogListener): () => void;
  clearLog(): void;
}
