# Demo React Native + Dynamic Yield

Tienda de ejemplo en React Native integrada con el **SDK oficial de Dynamic
Yield** (`@dynamicyield/react-native-sdk` v1.5.0): pageviews, campañas de
recomendación y de contenido, engagement (impresiones y clicks), eventos de
negocio y consentimiento activo.

La app arranca y funciona sin credenciales, con un adaptador simulado.

## Cómo se elige el adaptador

Toda la lógica de DY está detrás de una interfaz (`DyClient`) con dos
implementaciones. `createDyClient` elige en tiempo de ejecución:

| Condición | Adaptador |
|---|---|
| TurboModule `DYPlugin` presente **y** API key configurada | `nativeClient` — SDK real |
| Cualquier otro caso | `mockClient` — simulado |

El SDK es un TurboModule nativo: solo existe en un build real de iOS/Android.
En Jest, en Node o en un Metro sin build nativo no está, y `getEnforcing`
lanzaría al importarlo. Por eso `createClient.ts` comprueba antes con
`TurboModuleRegistry.get` (que devuelve `null` en vez de lanzar) y solo entonces
carga `nativeClient` con `require`. Ese fichero **no** se reexporta desde
`src/dy/index.ts` a propósito, para que un import estático no lo arrastre al
bundle de los tests.

El panel de depuración de la app indica cuál está activo.

## Arquitectura

```
src/dy/
  types.ts         Vocabulario de DY, calcado de la API real del SDK
  DyClient.ts      La interfaz contra la que programan las pantallas
  nativeClient.ts  Adaptador sobre @dynamicyield/react-native-sdk
  mockClient.ts    Adaptador simulado, con la misma secuencia de llamadas
  createClient.ts  Elige adaptador según disponibilidad del TurboModule
  payloads.ts      Validadores de payloads de campaña
  DyProvider.tsx   Contexto y hooks: useChoose, usePageView, useTrackEvent
  dyConfig.ts      API key y data center
```

Las pantallas importan siempre desde `src/dy`, nunca de un adaptador concreto.

## Configurar tu sección de DY

### 1. Instalar el SDK

El paquete **no está en el npm público**: se distribuye por GitHub Packages y
requiere un PAT **clásico** con el scope `read:packages`. Los tokens
*fine-grained* no sirven — el registro npm de GitHub los rechaza con
`does not match expected scopes`.

Crea `.npmrc` en la raíz (ya está en `.gitignore`):

```ini
@dynamicyield:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=TU_TOKEN_CLASICO
```

### 2. Poner la API key

En `src/dy/dyConfig.ts`, sustituye `DY_API_KEY` y ajusta `dataCenter`.

Usa la clave **client-side** de tu sección móvil (Consola de DY › Setup › API
Keys). **Nunca una server-side**: todo lo que se compila en la app es extraíble
de un APK/IPA, y una clave server-side tiene privilegios que no deben salir de
tu backend.

El fichero se commitea con un placeholder. Para trabajar en local sin arrastrar
la clave a un commit:

```sh
git update-index --skip-worktree src/dy/dyConfig.ts
```

En CI/producción, inyéctala en tiempo de build (`react-native-config`, variantes
de Gradle, xcconfig).

### 3. Crear las campañas

Los selectores que espera la demo están en `SELECTORS` (`src/dy/mockClient.ts`):

- `RN Demo — Home Recs` — recomendaciones (RECS)
- `RN Demo — PDP Similar Items` — recomendaciones (RECS)
- `RN Demo — Home Banner` — contenido (CUSTOM_JSON con `title`, `body`, `cta`)

## Ejecutar

Requisitos del SDK 1.5.0: **React Native ≥ 0.81**, iOS 14+, Android minSDK 24.

```sh
npm install
npm start           # Metro

npm run android
npm run ios         # antes: cd ios && pod install && cd ..
```

## Comprobaciones

```sh
npx tsc --noEmit
npx eslint . --ext .ts,.tsx
npm test
```

Los tests cubren el adaptador simulado y los validadores de payload. El
adaptador nativo no es testeable en Jest (necesita el TurboModule), pero `tsc`
lo verifica contra los tipos reales del SDK.

## Qué mirar en la demo

- **Home** — banner de contenido y carrusel "Recomendado para ti". El `choose`
  usa `isImplicitPageview`, así que DY registra el pageview en la misma llamada.
- **Ficha de producto** — `reportProductPageView` con el SKU,
  `reportAddToCartEvent` y carrusel de similares que excluye el producto actual.
- **Carrito** — `reportPurchaseEvent` con `uniqueTransactionId` para que DY
  deduplique la compra.
- **Panel `DY`** — qué adaptador está activo, la secuencia de llamadas en tiempo
  real y el interruptor de consentimiento.

## Detalles de la API que conviene conocer

Cosas que no son evidentes hasta leer los tipos del SDK:

- **Los ids de variación son numéricos**, no cadenas. Es lo que esperan
  `reportImpression` (un array) y `reportClick` (uno solo).
- **`CustomJsonPayload.data` llega como cadena JSON sin parsear**, mientras que
  en las campañas RECS llega como objeto. `payloads.ts` absorbe la diferencia.
- **El SDK no lanza excepciones**: devuelve un `DYResult` con `status`. Ignorar
  ese campo haría que los fallos pasaran desapercibidos, así que `nativeClient`
  los convierte en errores.
- **`NO_DECISION` no es un error**: significa que el usuario no entra en la
  campaña (grupo de control o segmentación). Se descarta silenciosamente.
- **`decisionId` es opcional**; sin él no se puede atribuir engagement.
- **`pageLocation` es obligatorio.** En una app nativa no hay URL, así que se usa
  un esquema propio (`dydemo://product/SKU-1001`).
- **El consentimiento no se persiste** entre lanzamientos: hay que pasarlo en
  cada `initialize`.

## Pendiente

El SDK soporta además Semantic Search (con spellcheck), Visual Search, Shopping
Muse (Assistant) y Rollout. De momento solo está implementado `getRolloutFlag`;
los tres primeros no tienen pantalla en la demo.
