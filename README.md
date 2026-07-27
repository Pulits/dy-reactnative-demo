# Demo React Native + Dynamic Yield

Tienda de ejemplo en React Native que muestra cómo integrar **Dynamic Yield**:
pageviews, campañas de recomendación, banner de contenido, engagement
(impresiones y clicks), eventos de negocio y consentimiento activo.

La app arranca y funciona tal cual, sin credenciales.

## Estado actual: cliente simulado

Toda la lógica de DY vive detrás de una interfaz (`DyClient`) y hoy corre sobre
un **adaptador simulado** (`src/dy/mockClient.ts`), no contra los servidores de
Dynamic Yield.

El motivo es que el SDK oficial `@dynamicyield/react-native-sdk` **no se publica
en el npm público**: se distribuye por GitHub Packages (`npm.pkg.github.com`) y
requiere un *personal access token* **clásico** con el scope `read:packages`.
Los tokens *fine-grained* no sirven — el registro npm de GitHub no los acepta.

El adaptador simulado no personaliza nada: devuelve decisiones deterministas.
Lo que sí reproduce con fidelidad es **la secuencia de llamadas** que hace una
integración real, visible en el panel de actividad (botón `DY` de la cabecera).

## Arquitectura

```
src/dy/
  types.ts        Vocabulario de DY: contexto de página, variaciones, eventos
  DyClient.ts     La interfaz contra la que programan las pantallas
  payloads.ts     Validadores de payloads de campaña (devuelven null, no revientan)
  mockClient.ts   Adaptador simulado (implementación actual)
  DyProvider.tsx  Contexto de React y hooks: useChoose, usePageView, useTrackEvent
  dyConfig.ts     API key y data center
```

Las pantallas importan siempre desde `src/dy`, nunca de un adaptador concreto.
Esa es la pieza clave: cambiar de implementación no toca la UI.

## Migrar al SDK oficial

1. Consigue un PAT **clásico** con `read:packages`
   (Settings › Developer settings › Personal access tokens › **Tokens (classic)**).

2. Crea `.npmrc` en la raíz — ya está en `.gitignore`:

   ```ini
   @dynamicyield:registry=https://npm.pkg.github.com/
   //npm.pkg.github.com/:_authToken=TU_TOKEN
   ```

3. Instala el paquete:

   ```sh
   npm install @dynamicyield/react-native-sdk
   cd ios && pod install && cd ..
   ```

4. Crea `src/dy/nativeClient.ts` implementando `DyClient` sobre el SDK, y
   cámbialo en `src/dy/DyProvider.tsx`:

   ```ts
   // - clientRef.current = createMockDyClient();
   // + clientRef.current = createNativeDyClient();
   ```

   Las pantallas no se tocan. Los tests de `__tests__/dyClient.test.ts` describen
   el contrato que el nuevo adaptador debe cumplir.

5. Pon tu API key **client-side** en `src/dy/dyConfig.ts` y ajusta `dataCenter`.

## API key: usa la client-side

`src/dy/dyConfig.ts` se commitea con un placeholder a propósito.

Usa siempre la clave **client-side** de tu sección móvil (Consola de DY › Setup ›
API Keys). **Nunca una clave server-side**: todo lo que se compila en la app es
extraíble de un APK/IPA, y una clave server-side tiene privilegios que no deben
salir de tu backend.

Para trabajar en local sin arrastrar la clave a un commit:

```sh
git update-index --skip-worktree src/dy/dyConfig.ts
```

En CI/producción, inyéctala en tiempo de build (`react-native-config`, variantes
de Gradle, xcconfig) en lugar de dejarla escrita en el fichero.

## Ejecutar

Requisitos según el SDK de DY: React Native ≥ 0.77, iOS 14+, Android minSDK 24.

```sh
npm install
npm start           # Metro

npm run android
npm run ios         # requiere pod install previo
```

## Comprobaciones

```sh
npx tsc --noEmit
npx eslint . --ext .ts,.tsx
npm test
```

## Qué mirar en la demo

- **Home** — banner de contenido y carrusel "Recomendado para ti", ambos
  servidos por campañas. El `choose` de la home usa `implicitPageview`, así que
  DY registra el pageview en la misma llamada.
- **Ficha de producto** — `usePageView` con el SKU en el contexto, evento
  `add-to-cart-v1` y carrusel de similares que excluye el producto actual.
- **Carrito** — evento `purchase-v1` con `uniqueTransactionId` para que DY
  deduplique la compra.
- **Panel `DY`** — la secuencia de llamadas en tiempo real y el interruptor de
  consentimiento activo. Al denegarlo, las decisiones pasan a marcarse como no
  personalizadas.

## Pendiente

No implementado, a la espera de acceso al SDK real: Semantic Search (con
spellcheck), Visual Search, Shopping Muse (Assistant) y campañas de Rollout — de
esta última solo está el hueco en la interfaz (`getRolloutFlag`).
