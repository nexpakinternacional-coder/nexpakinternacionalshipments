# Nexpak — Plataforma de rastreo de envíos internacionales

## Contexto del proyecto

Nexpak es una agencia de envíos internacionales nueva. Este software tiene dos partes:

1. **Vista pública (clientes finales):** el usuario ingresa su número de guía y ve el estado de su envío y su historial. Cuando un administrador cambia el estado, la página se actualiza sola, sin recargar.
2. **Dashboard administrativo:** los administradores registran envíos (remitente, destinatario y paquete), el sistema genera la guía automáticamente, y ellos actualizan el estado del envío a medida que avanza.

"Tiempo real" significa que el cambio de estado hecho por un admin se refleja al instante en la vista pública. **No hay rastreo satelital** de vehículos; sin embargo, cada evento lleva un punto en el mapa que el administrador ubica manualmente (una bodega, una aduana, un centro de distribución). El cliente ve el recorrido de su paquete trazado punto a punto.

- Desarrollador: trabaja en Windows. La ruta local es `C:\Users\CAMI\Desktop\Proyecto Envios`.
- Es la primera vez que el desarrollador usa Supabase y Cloudflare. Cuando un paso requiera acción manual en esos paneles, explícalo paso a paso y en español.
- Presupuesto de infraestructura: **$0**. Todo debe caber en los planes gratuitos. Solo el dominio (Namecheap) es pago.
- Idioma de la interfaz: español. El inglés se agregará después (fase 8), así que los textos visibles deben quedar centralizados y no repartidos por todo el código.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript |
| Mapas | MapLibre GL JS + OpenFreeMap (sin clave de API) |
| Estilos | Tailwind CSS |
| Rutas | React Router |
| Backend | Supabase: Postgres, Auth, Realtime y funciones RPC |
| Cliente de Supabase | `@supabase/supabase-js` |
| Hosting | Cloudflare Pages (sitio estático, SPA) |
| Código y automatizaciones | GitHub y GitHub Actions |

**No hay servidor propio.** Toda la lógica sensible vive en Postgres: funciones, triggers y políticas RLS. El frontend solo usa la clave pública (anon o publishable) de Supabase. La clave `service_role` (secret) **nunca** va en el frontend ni en el repositorio.

### Variables de entorno

Van en `.env.local`, que no se sube a git. Mantén un `.env.example` actualizado.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Formato de la guía

- Formato: `NXP` seguido de 7 caracteres. Ejemplo visual: `NXP-7KQ4MX9`. El guion es solo de presentación; en la base de datos se guarda sin guion, como `NXP7KQ4MX9`.
- **Alfabeto permitido (29 caracteres):** `ABCDEFGHJKMNPQRTUVWXYZ2346789`. Se excluyen los caracteres confusos: 0, O, 1, I, L, 5 y S.
- Los primeros 6 caracteres son aleatorios.
- El 7.º carácter es un **dígito verificador**. Se calcula así: suma ponderada de las posiciones de los 6 caracteres en el alfabeto (con pesos 1 a 6), módulo 29, y se toma el carácter del alfabeto en esa posición.
- La guía la genera **la base de datos**, con una función de Postgres que reintenta si hay colisión. La columna tiene restricción `UNIQUE`.
- El frontend tiene la misma validación en `src/lib/guia.ts`, para detectar errores de digitación antes de consultar.
- La entrada del usuario se normaliza a mayúsculas y sin espacios ni guiones. Si contiene caracteres fuera del alfabeto o el verificador no coincide, se muestra "Guía inválida, revisa el número" sin consultar la base de datos.

## Estados del envío

Se implementan como enum de Postgres `estado_envio`.

**Flujo normal, en orden:**
1. `guia_generada`: Guía generada
2. `recibido_origen`: Recibido en bodega de origen
3. `transito_internacional`: En tránsito internacional
4. `en_aduana`: En aduana
5. `liberado_aduana`: Liberado de aduana
6. `centro_distribucion`: En centro de distribución destino
7. `en_reparto`: En reparto
8. `entregado`: Entregado

**Excepciones:** `novedad`, `retenido_aduana`, `intento_fallido`, `devuelto`.

Las etiquetas visibles, los colores y los íconos de cada estado se definen en un solo lugar: `src/lib/estados.ts`.

## Modelo de datos

Se maneja con migraciones SQL en `supabase/migrations/`.

- **`perfiles`**: `id` (FK a `auth.users`), `nombre`, `rol` (`admin` | `operador`), `activo`, `created_at`.
- **`envios`**:
  - `id`, `guia` (unique)
  - Remitente: `remitente_nombre`, `remitente_telefono`, `remitente_email`, `remitente_direccion`, `remitente_pais`, `remitente_ciudad`
  - Destinatario: `destinatario_nombre`, `destinatario_telefono`, `destinatario_email`, `destinatario_direccion`, `destinatario_pais`, `destinatario_ciudad`, `destinatario_documento`
  - Paquete: `descripcion_contenido`, `peso_kg`, `largo_cm`, `ancho_cm`, `alto_cm`, `valor_declarado`, `moneda`, `tipo_servicio` (`estandar` | `express`)
  - Seguimiento: `estado_actual`, `fecha_estimada_entrega`
  - Auditoría: `creado_por`, `created_at`, `updated_at`
- **`eventos_envio`** (historial): `id`, `envio_id`, `estado`, `ubicacion` (texto, ej. "Miami, EE. UU."), `nota_publica` (la ve el cliente), `nota_interna` (solo admins), `ocurrido_en`, `creado_por`, `created_at`.
- Al insertar un evento, un trigger actualiza `envios.estado_actual` y `updated_at`.
- Al crear un envío, se inserta automáticamente su primer evento: `guia_generada`.

## Seguridad (obligatorio)

### Regla permanente: borrado lógico

**Ningún dato se elimina físicamente de la base de datos.** Los registros se *inactivan* (envíos, perfiles) o se *anulan* (eventos). Esto garantiza trazabilidad y auditoría. La base de datos tiene dos barreras: (1) `REVOKE DELETE` en `envios`, `eventos_envio` y `perfiles` para los roles `anon` y `authenticated`; (2) un trigger `BEFORE DELETE` que lanza excepción si algún mecanismo lo intenta de todas formas. En el frontend, el botón "Eliminar" no existe: se usa "Inactivar" con motivo obligatorio y confirmación de guía.

- **RLS activado en todas las tablas.**
- El rol `anon` **no** tiene acceso directo a ninguna tabla.
- La consulta pública se hace **solo** con la función RPC `rastrear_envio(p_guia text)`, definida como `SECURITY DEFINER` y con `search_path` fijo. Devuelve únicamente:
  - `guia`, `estado_actual`, `tipo_servicio`, `fecha_estimada_entrega`
  - ciudad y país de origen y de destino
  - el nombre del destinatario parcialmente oculto (ej. "Juan P.")
  - los eventos (estado, ubicación, nota pública y fecha)
  - **Nunca** devuelve teléfonos, emails, direcciones, documentos, valor declarado ni notas internas.
- Los usuarios `authenticated` con un perfil activo pueden leer y escribir `envios` y `eventos_envio`. Solo `admin` puede eliminar envíos y gestionar perfiles.
- El registro público de usuarios está **desactivado** en Supabase Auth. Los admins se crean o invitan desde el panel de Supabase, o más adelante desde el dashboard.

### Tiempo real en la vista pública

Como `anon` no puede leer tablas, no se usa `postgres_changes`. En su lugar:

1. Un trigger en `eventos_envio` envía un mensaje **Broadcast** de Supabase Realtime (usando `realtime.send` o `realtime.broadcast_changes`; verificar la API vigente en la documentación) al tema `envio:<GUIA>`, con un contenido mínimo, por ejemplo `{ "actualizado": true }`.
2. La página pública se suscribe a ese tema y, al recibir el aviso, vuelve a llamar a `rastrear_envio`.
3. Como respaldo, consulta cada 60 s mientras la pestaña esté visible.

## Estructura de carpetas

```
src/
  lib/            supabase.ts, guia.ts, estados.ts, formato.ts
  textos/         es.ts (y luego en.ts)
  components/     componentes compartidos (UI)
  features/
    rastreo/      vista pública
    auth/         login de admins
    envios/       listado, crear, detalle y edición
    eventos/      cambio de estado e historial
  layouts/        PublicLayout, AdminLayout
  routes/         definición de rutas
supabase/
  migrations/     SQL versionado
.github/workflows/  keep-alive y respaldo de la BD
```

### Rutas

- `/`: inicio con el buscador de guía
- `/rastreo/:guia`: resultado del rastreo
- `/admin/login`
- `/admin`: resumen (envíos por estado, últimos movimientos)
- `/admin/envios`: listado con búsqueda y filtros
- `/admin/envios/nuevo`
- `/admin/envios/:id`: detalle, cambio de estado e historial

Las rutas `/admin/*` están protegidas: sin sesión, redirigen al login.

## Convenciones

- Código en TypeScript estricto. Nombres de dominio en español (`envio`, `guia`, `destinatario`); términos técnicos en inglés cuando es lo natural (`hooks`, `utils`).
- Componentes funcionales con hooks. Sin librerías de estado global salvo que se necesiten de verdad.
- Diseño mobile-first. La vista pública se usará sobre todo desde el celular.
- Fechas en la zona horaria del navegador. En la base de datos se usa `timestamptz`.
- No subir secretos: `.env.local` va en `.gitignore`.
- Commits pequeños y descriptivos, en español.
- El desarrollador usa Windows: los comandos de terminal deben funcionar en PowerShell.
- Todo cambio visual en el layout del panel admin se verifica con `npm run verificar:layout` antes de entregarlo. El script prueba 5 viewports (1366×768, 1920×1080, 768×1024, 390×844, 440×956) y comprueba: sin doble scroll, solo `<main>` scrollea, barra de acciones visible.
- **Antes de reportar cualquier cambio como terminado**, correr `npm run verificar:rutas`. El script abre cada ruta de la app con Playwright y falla si: (a) hay cualquier error en la consola del navegador (SyntaxError, módulo sin export nombrado, ReferenceError, etc.) o (b) la página queda en blanco. Esto detecta roturas en tiempo de ejecución que `tsc` no ve porque Vite no ejecuta tsc en modo dev.

## Comandos

```
npm install
npm run dev             # servidor local
npm run build           # build de producción (carpeta dist/)
npm run preview
npm run db:tipos        # regenera src/lib/database.types.ts desde el esquema remoto de Supabase
                        # USAR SIEMPRE ESTO en lugar de npx supabase gen types ... > archivo
                        # El script elimina líneas de advertencia del CLI automáticamente y corre tsc.
npm run verificar:rutas # abre cada ruta y falla si hay errores de consola o página en blanco
npm run verificar:layout # verifica layout del panel admin en 5 viewports
npx supabase ...        # CLI de Supabase vía npx, sin instalación global
```

## Despliegue

- **Cloudflare Pages:** se conecta al repositorio de GitHub. Configuración: build command `npm run build`, output `dist`. Las variables `VITE_*` se configuran en el panel de Cloudflare. El fallback de SPA debe permitir que `/rastreo/ABC` cargue `index.html` (verificar el mecanismo vigente, por ejemplo `public/_redirects`).
- **Dominio:** se compra en Namecheap. Los nameservers se apuntan a Cloudflare y luego se agrega el dominio personalizado al proyecto de Pages.
- **Supabase Auth:** configurar el Site URL y las Redirect URLs con el dominio final.
- **Plan gratuito de Supabase:** el proyecto se pausa tras 7 días sin actividad. Un workflow de GitHub Actions (`keep-alive.yml`) hace una consulta liviana cada 3 días. Otro workflow (`backup.yml`) hace un `pg_dump` semanal, ya que el plan gratis no incluye respaldos.

## Fases y estado

Marca cada fase con [x] cuando esté terminada.

- [ ] **Fase 0: Cuentas.** GitHub, Supabase (región East US) y Cloudflare. Instalar Node LTS y Git. (Manual, guiado desde el chat.)
- [x] **Fase 1: Proyecto base.** Vite, React y TypeScript; Tailwind; React Router; estructura de carpetas; layouts vacíos; `.env.example`; Git inicializado.
- [x] **Fase 2: Base de datos.** Migraciones: enum, tablas, triggers, función de guía, `rastrear_envio`, RLS y broadcast.
- [x] **Fase 3: Auth admin.** Login, rutas protegidas, AdminLayout y cierre de sesión.
- [x] **Fase 4: Envíos.** Crear envío (formulario validado), listado con búsqueda y filtros, y vista de detalle.
- [x] **Fase 5: Estados.** Cambiar estado (estado, ubicación, notas) y ver el historial en el detalle.
- [x] **Fase 6: Vista pública.** Buscador, validación de la guía, línea de tiempo y actualización en vivo. Incluye auditoría de autores, pulido visual (fase 6b), script db:tipos y verificar:rutas.
- [x] **Fase D1: Logo e identidad de marca.** Componente `<Logo />`, archivos en `src/assets/marca/`, favicons reales, `manifest.webmanifest`, Open Graph con `og-image.png`, hoja de marca en `/dev/marca` (solo DEV), y sección Marca en CLAUDE.md.
- [ ] **Fase R1: Mapa interactivo y ubicaciones.** Coordenadas en `envios` y `eventos_envio`; tabla `ubicaciones`; componente `MapaEnvio` (MapLibre GL JS + OpenFreeMap); `SelectorUbicacion` para el admin (chips de frecuentes, Nominatim, pin arrastrable); mapa en rastreo público con actualización en vivo.
- [ ] **Fase 7: Despliegue.** Cloudflare Pages, dominio, URLs de Auth, keep-alive y respaldo.
- [ ] **Fase 8: Extras.** Rótulo imprimible en PDF con QR, notificaciones por correo, inglés y resumen en el dashboard.

## Identidad visual

### Paleta (tokens de Tailwind — definidos en `src/index.css` con `@theme`)

| Token | Hex | WCAG AA sobre blanco | Uso |
|---|---|---|---|
| `navy` | `#0F2D5E` | 13.6:1 ✓ | Sidebar, logo, encabezados |
| `accent` | `#E8500A` | 3.7:1 (solo íconos/elementos grandes) | Bordes activos, indicadores |
| `accent-strong` | `#C2410C` | 5.1:1 ✓ | Botones con texto blanco, texto en naranja |
| `canvas` | `#F4F6F9` | — | Fondo de páginas |
| `surface` | `#FFFFFF` | — | Tarjetas, formularios |
| `border` | `#D1D9E6` | — | Bordes de inputs, separadores |
| `ink` | `#111827` | 18.1:1 ✓ | Texto principal |
| `ink-muted` | `#6B7280` | 4.7:1 ✓ | Texto secundario (usar sobre `surface` blanco) |

### Tipografía

- **IBM Plex Sans** 400 y 600 para toda la interfaz (`@fontsource/ibm-plex-sans`).
- **IBM Plex Mono** 400 para guías, IDs y datos numéricos en tablas (`@fontsource/ibm-plex-mono`).
- **Archivo ExtraBold** es la tipografía del logotipo (nombre "Nexpak"), pero ya está convertida a trazos en los SVG. No se usa como webfont.
- Sin itálicas en la interfaz. Sin fuentes decorativas.

### Marca — archivos

| Archivo | Ruta |
|---|---|
| `isotipo.svg` | `src/assets/marca/` |
| `isotipo-blanco.svg` | `src/assets/marca/` |
| `isotipo-negro.svg` | `src/assets/marca/` |
| `logo-horizontal.svg` | `src/assets/marca/` |
| `logo-horizontal-blanco.svg` | `src/assets/marca/` |
| `logo-horizontal-negro.svg` | `src/assets/marca/` |
| `favicon.svg`, `favicon.ico` | `public/` |
| `apple-touch-icon.png` | `public/` |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | `public/` |
| `og-image.png` (1200×630) | `public/` |
| `generar-logo.js`, `hoja-marca.png` | `docs/marca/entregables/` (referencia) |

Viewboxes: isotipo `0 0 80 68`, logo horizontal `0 0 365.88 68`. El componente `<Logo />` en `src/components/Logo.tsx` importa los SVG como `?url` y calcula el ancho a partir del `alto` y la proporción del viewBox.

### Marca — reglas de uso

- Espacio libre alrededor del logo igual a la altura de la tapa naranja (`#E8500A`).
- Tamaño mínimo: 24 px de alto para el logo horizontal; 16 px para el isotipo.
- Versión blanca (`tono="blanco"`) sobre azul marino o fondos oscuros.
- Versión negra (`tono="negro"`) para impresión térmica (rótulo PDF).
- **No hacer:** deformar, rotar, cambiar colores, agregar sombras o degradados, ni separar la tapa naranja de la N.

### Estilo general

- Flat con sombra sutil: `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` en tarjetas.
- Bordes `1px` con `border-border` en inputs y tarjetas.
- Íconos: **Lucide React** (`strokeWidth={1.75}`, 18 px en nav, 16 px en contenido inline).
- Los estados de envío siempre van con ícono + etiqueta de texto, nunca solo color.
- Solo modo claro. Dark mode: Fase 8.

## Decisiones tomadas

- Se eligió Vite en lugar de Next.js porque el plan gratuito de Vercel prohíbe el uso comercial. Cloudflare Pages lo permite y sirve sitios estáticos.
- La guía se genera en la base de datos y no en el frontend, para garantizar que sea única y evitar manipulación.
- La vista pública no lee tablas directamente: usa RPC y Broadcast para no exponer datos personales.
- Se usa Tailwind CSS v4 (no v3): la configuración va en `vite.config.ts` mediante el plugin `@tailwindcss/vite`; el CSS solo necesita `@import "tailwindcss"` y no se requiere `tailwind.config.js`.
- React Router v7 se usa en modo librería (no framework): `createBrowserRouter` + `RouterProvider` en `main.tsx`, con `<Outlet />` en los layouts para rutas anidadas. La ruta `/admin/login` es independiente (no anidada bajo `AdminLayout`) para simplificar el guard de auth en la Fase 3.
- El fallback de SPA para Cloudflare Pages se resuelve con `public/_redirects` (`/* /index.html 200`), que es el mecanismo estándar y vigente.
- Vitest se usa para tests unitarios con importaciones explícitas (`import { describe, it, expect } from 'vitest'`), no con globals, para evitar configuración extra en tsconfig.
- El `name` en `package.json` es `nexpak` porque la carpeta del proyecto tiene un espacio y no puede usarse como nombre de paquete npm.
- La CLI de Supabase (v3) apunta por defecto al stack local (Docker). Para operar sobre la base remota se usa siempre `npx supabase db push --remote`. No usamos Docker ni base de datos local.
- Los mapas usan **MapLibre GL JS** con estilo de **OpenFreeMap** (`tiles.openfreemap.org/styles/liberty`). Sin clave de API. Búsqueda de lugares con **Nominatim** (`nominatim.openstreetmap.org/search`). Ambos dominios deben estar en la CSP (Fase H). Atribución obligatoria: "© OpenFreeMap · © OpenStreetMap contributors".
- El diseño visual se desarrolla con la skill **ui-ux-pro-max** (`.claude/skills/ui-ux-pro-max/`) y el plugin **frontend-design**, ambos incluidos en el repositorio. Permiten definir paletas, tipografías, estilos de componentes y generar código de interfaz con criterio de diseño de producto.
