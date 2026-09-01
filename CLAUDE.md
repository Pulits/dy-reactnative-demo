# Contexto del proyecto

Port a React Native de **Blueberry iOS**, una demo de tienda integrada con el
SDK de Dynamic Yield. El objetivo es que sean la misma app: mismas campañas,
mismos selectores, mismos eventos.

La app de iOS original no está en este repo. Si hace falta consultarla, pídesela
al usuario (la tiene como `.zip`).

## Lo primero que hay que hacer

`src/dy/nativeClient.ts` es el único fichero que importa el SDK, y el SDK vive
en GitHub Packages: necesita un `.npmrc` con un PAT **clásico** con
`read:packages`. Sin él, `npm install` da 401 y **Metro no empaqueta**, ni
siquiera con el adaptador simulado, porque resuelve el `require` de
`createClient.ts` en tiempo de empaquetado.

```sh
npx tsc --noEmit
```

El fichero ya compila limpio contra los tipos reales del SDK.

## Arquitectura

La capa de DY está partida en dos a propósito:

- **`DyClient`** — frontera fina con el SDK. Un método por llamada del SDK, sin
  interpretar nada. Dos implementaciones: `nativeClient` y `mockClient`.
- **`DyService`** — port de `DynamicYieldManager.swift`. Toda la lógica: qué
  selector pide cada pantalla, cómo se interpreta cada payload, qué se registra
  en el informe de actividad.

Así el mismo código corre con el SDK real y con el simulado, y el parseo queda
cubierto por tests. **Las pantallas importan siempre desde `src/dy`**, nunca de
un adaptador concreto.

`createClient.ts` no se reexporta desde `src/dy/index.ts` a propósito: un import
estático arrastraría el adaptador nativo al bundle de los tests.

## Reglas que no son obvias

- **El dyid solo se regenera con un `choose`.** Un pageview no vale: exige una
  sesión ya válida y responde 422 justo después del reset.
- **Al usuario solo se le identifica cuando el `cuidType` es `email`.** Mandar
  el dyid como `cuid` atribuye el comportamiento a un perfil identificado y
  rompe las afinidades, que se leen del dyid anónimo. Hay un test que lo fija.
- **Los selectores son case-sensitive.** Si uno no coincide con la consola de
  DY, esa sección se queda vacía **sin error visible**. Es el fallo más común.
- **El `custom` de las campañas RECS llega como cadena JSON sin parsear**, igual
  que el `data` de las CUSTOM_JSON.
- **`warning` cuenta como éxito** y **`NO_DECISION` no es un error**.
- **El feed puede mandar el precio como cadena** y usa `snake_case`.
- **No inventar valores que DY guarde como afinidad.** Por eso el `size` de
  `Add to Wishlist` va vacío en vez de `"one size"`.

## Seguridad

**El repositorio es público.** `src/config/dyKeys.ts` se commitea con
placeholders y va commiteado (no ignorado) porque Metro resuelve los imports al
empaquetar: ausente rompería el bundle de un clon nuevo. Antes de poner claves
reales:

```sh
git update-index --skip-worktree src/config/dyKeys.ts
```

Nunca commitear claves reales de DY aquí.

## Dependencias nativas

No añadir sin comprobar antes que `npm install` funciona: mientras falle por el
SDK, el lockfile no se puede regenerar y una dependencia nativa nueva dejaría el
repo peor. Por eso hay navegación propia (`src/navigation/`) en vez de React
Navigation, storage en memoria en vez de `AsyncStorage`, y Visual Search sin
pantalla aunque `DyService.visualSearch` esté implementado.

Si el `npm install` ya funciona, esas tres decisiones se pueden revisar. Las
pantallas navegan todas por el hook `useNavigation`, así que cambiar el
navegador no las toca.

## Verificar

```sh
npx tsc --noEmit
npx eslint . --ext .ts,.tsx
npm test
npx react-native bundle --platform ios --dev true --entry-file index.js \
  --bundle-output /tmp/bundle.js
```

El bundle de Metro es la comprobación que de verdad atrapa los fallos de
resolución; `tsc` solo no basta.

## Entorno

No usar OneDrive ni carpetas sincronizadas: Metro vigila miles de ficheros y la
sincronización de fondo provoca errores de watcher y builds a medias.
