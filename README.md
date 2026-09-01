# Blueberry — React Native + Dynamic Yield

Port a React Native de la app **Blueberry iOS**, con la misma integración de
Dynamic Yield: mismas campañas, mismos selectores, mismos eventos.

La app arranca y funciona sin credenciales, con un adaptador simulado.

## Qué está portado

| Área | Detalle |
|---|---|
| Pantallas | Splash, login de identidad, Home, Explore, Categoría, Ficha de producto, Carrito, Wishlist, Shopping Muse, Profile |
| Choose | Home Recs, Hero Banner Mobile, Home Banner 1–4, Bottom Banner, PDP Recs, Cart Recs, Most Popular in Category, Most Affinity with in Category, Search Overlay Recs, Fetch Single Product, Social Proof, Muse Home |
| Pageviews | home, category, product, cart, other |
| Eventos | Add to Cart, Remove from Cart, Sync Cart, Purchase, Add to Wishlist, Keyword Search, Login y el evento custom "Recently Viewed" |
| Engagement | SLOT_CLICK, CLICK y SLOT_IMP |
| Shopping Muse | Chat con hilo, Personalized Inspirations y Complete the Look |
| Search | Semantic Search con spellcheck y filtro por categoría |
| Identidad | getDyId, getSessionId, regeneración del dyid, consentimiento activo |
| Afinidad | `rcom/userAffinities` (client-side) y `/userprofile` (Profile Anywhere) |

### Lo que no está

- **Visual Search.** El SDK la expone y la capa la implementa
  (`DyService.visualSearch`), pero no tiene pantalla: haría falta un selector de
  fotos, que es una dependencia nativa (ver más abajo por qué no se añaden).
- **Persistencia de la identidad entre lanzamientos.** iOS la guarda en
  `UserDefaults`; aquí vive en memoria. `DyStorage` es la interfaz que hay que
  implementar con `AsyncStorage` para igualarlo.

## Arquitectura

```
src/config/
  dyKeys.ts        Credenciales (placeholders en el repo)
  appConfig.ts     Port de Configuration.swift: selectores, textos, límites
src/dy/
  types.ts         Vocabulario de DY, calcado de la API real
  DyClient.ts      Frontera fina con el SDK: una llamada del SDK por método
  nativeClient.ts  Adaptador sobre @dynamicyield/react-native-sdk
  mockClient.ts    Adaptador simulado, con respuestas de la misma forma
  createClient.ts  Elige adaptador según disponibilidad del TurboModule
  parse.ts         Parseo de payloads: productos, encabezados, HTML, atributos
  DyService.ts     Port de DynamicYieldManager.swift
  affinity.ts      Los dos endpoints REST de afinidad
  DyProvider.tsx   Contexto de React
```

La capa está partida en dos a propósito. `DyClient` traduce tipos y nada más;
`DyService` tiene la lógica —qué selector pide cada pantalla, cómo se interpreta
cada payload, qué se registra en el informe de actividad—. Así el mismo código
corre con el SDK real y con el simulado, y el parseo, que es la parte con reglas
de verdad, queda cubierto por tests.

Las pantallas importan siempre desde `src/dy`, nunca de un adaptador concreto.

### Cómo se elige el adaptador

| Condición | Adaptador |
|---|---|
| TurboModule `DYPlugin` presente **y** API key configurada | `nativeClient` — SDK real |
| Cualquier otro caso | `mockClient` — simulado |

El SDK es un TurboModule nativo: solo existe en un build real de iOS o Android.
En Jest, en Node o en un Metro sin build nativo no está, y `getEnforcing`
lanzaría al importarlo. Por eso `createClient.ts` comprueba antes con
`TurboModuleRegistry.get` (que devuelve `null` en vez de lanzar) y solo entonces
carga `nativeClient` con `require`. Ese fichero **no** se reexporta desde
`src/dy/index.ts`, para que un import estático no lo arrastre al bundle de los
tests.

El adaptador activo se ve en la pestaña **Profile**.

## Configurar tu sección

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

**El `.npmrc` va ANTES del primer `npm install`.** Está en `.gitignore` —con
razón, porque lleva un token— así que un clon recién hecho no lo tiene. Sin él,
`npm install` busca `@dynamicyield/react-native-sdk` en el npm público y falla
con un 404 engañoso: el paquete existe, pero solo en GitHub Packages.

No hay atajo: Metro resuelve el `require` de `createClient.ts` en tiempo de
empaquetado, aunque en ejecución esa rama no se tome. Sin el paquete instalado
no hay bundle, ni con el adaptador simulado.

### 2. Poner las claves

En `src/config/dyKeys.ts`, sustituye los placeholders.

⚠️ **Este repositorio es público.** El fichero se commitea con placeholders a
propósito; al poner las claves reales, evita que salgan en un commit:

```sh
git update-index --skip-worktree src/config/dyKeys.ts
```

Se commitea en vez de ignorarse porque Metro resuelve los imports al empaquetar:
un fichero ausente rompería el bundle de un clon recién hecho, en vez de
degradar. En CI/producción, inyecta las claves en tiempo de build
(`react-native-config`, variantes de Gradle, xcconfig).

La app de iOS usa una clave **server-side**. En un móvil eso es discutible —todo
lo que se compila es extraíble de un APK/IPA— pero se replica tal cual para que
las dos versiones hablen con la misma sección. Si tu sección tiene una clave
client-side para móvil, úsala.

### 3. Crear las campañas

Los selectores están en `appConfig.selectors` y son los mismos que espera la app
de iOS. Son **case-sensitive**: si no coinciden exactamente, el `choose`
responde sin esa campaña y la sección se queda vacía, sin error visible.

## Ejecutar

Requisitos: **Node ≥ 20.19.4** (lo exige React Native 0.81), iOS 14+,
Android minSDK 24.

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
npx react-native bundle --platform android --dev true \
  --entry-file index.js --bundle-output /tmp/bundle.js
```

Los tests cubren el parseo de payloads y `DyService` completo contra el
adaptador simulado, más un test de humo que monta la app entera.

El adaptador nativo no es testeable en Jest (necesita el TurboModule); lo que sí
lo verifica es `tsc` contra los tipos reales del SDK, **una vez el paquete esté
instalado**. Ver "Estado" abajo.

## Sin dependencias nativas nuevas

La navegación es propia (`src/navigation/`), no React Navigation. El motivo es
concreto: React Navigation arrastra `react-native-screens`, y el lockfile no se
puede regenerar mientras `npm install` falle con 401 por el SDK de DY. Añadir
una dependencia nativa sin poder resolver el árbol ni construirla dejaría el
repo en un estado peor que el actual. Las pantallas navegan todas por el hook
`useNavigation`, así que cambiarlo por un stack navigator de verdad no las toca.

Lo mismo vale para `AsyncStorage` (persistencia de identidad) y el selector de
fotos (Visual Search).

## Estado

Verificado en este repo: `tsc`, `eslint`, 41 tests y el bundle de Metro para
Android e iOS.

**`src/dy/nativeClient.ts` está verificado casi del todo.** Con el paquete
instalado en una máquina con el PAT, `tsc` reveló tres desajustes, ya
corregidos: `reportCustomEvents` era `reportCustomEvent` y su `map` un `Map` en
vez de objeto plano; `reportAddToWishListEvent` exige un `size` que el SDK de
iOS no pide; y `pageAttributes` va como `Map<string, PageAttribute>`. Todo lo
demás compiló limpio, incluidos Assistant, Semantic y Visual Search, el
engagement por slot y los eventos de keyword search y login.

Queda **una línea** por confirmar: `toPageAttributes` asume que `PageAttribute`
es una clase que envuelve el valor, como en iOS. Un `npx tsc --noEmit` con el
paquete instalado lo confirma o lo desmiente.

## Detalles de la API que conviene conocer

Cosas que no son evidentes hasta leer el código:

- **El dyid solo se regenera con un `choose`.** Un pageview no vale: exige una
  sesión ya válida y responde 422 justo después del reset.
- **Al usuario solo se le identifica cuando el `cuidType` es `email`.** Mandar el
  dyid como `cuid` atribuye el comportamiento a un perfil identificado y rompe
  las afinidades, que se leen del dyid anónimo.
- **El nombre de la categoría viaja como custom attribute `category-filter`**,
  que es lo que lee el real-time filter de las campañas de categoría.
- **El `custom` de las campañas RECS llega como cadena JSON sin parsear**, igual
  que el `data` de las CUSTOM_JSON. Muse mete ahí su configuración además del
  title/subtitle.
- **Los ids de variación son numéricos**, no cadenas.
- **El SDK no lanza excepciones**: devuelve un `DYResult` con `status`. El
  estado `warning` cuenta como éxito.
- **`NO_DECISION` no es un error**: el usuario no entra en la campaña (grupo de
  control o segmentación). Se descarta en silencio.
- **`pageLocation` es obligatorio.** Se usan las mismas etiquetas planas que
  iOS ("Home", "PDP", "Cart", "Muse Home", "Search") para que las campañas
  segmenten igual en ambas plataformas.
- **El consentimiento no se persiste** entre lanzamientos: hay que pasarlo en
  cada `initialize`.
- **El feed puede mandar el precio como cadena**, y usa `snake_case`.
