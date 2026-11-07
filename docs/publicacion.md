# Guía de publicación — Nexpak

Sigue estos pasos en orden. Están escritos para alguien que nunca ha configurado Cloudflare ni GitHub Actions.

---

## Paso 1 — Secretos de GitHub Actions

Los workflows de keep-alive y respaldo necesitan cuatro secretos. Debes crearlos antes de que GitHub pueda ejecutarlos.

### Dónde crearlos

1. Ve a tu repositorio en GitHub.
2. Haz clic en **Settings** (pestaña superior derecha).
3. En el menú izquierdo abre **Secrets and variables → Actions**.
4. Para cada secreto: haz clic en **New repository secret**, escribe el nombre exacto y pega el valor.

### Secreto 1: `SUPABASE_URL`

**Qué es:** la URL del proyecto de Supabase (sin barra al final).

**Dónde conseguirlo:** Supabase → tu proyecto → **Settings → API → Project URL**.

**Valor:** `https://axqhjdfwoinnjlvtbapg.supabase.co`

---

### Secreto 2: `SUPABASE_ANON_KEY`

**Qué es:** la clave pública (anon) de Supabase. Es la misma que usa el frontend.

**Dónde conseguirla:** Supabase → **Settings → API → Project API keys → anon public**.

---

### Secreto 3: `SUPABASE_DB_URL`

**Qué es:** la cadena de conexión directa a la base de datos, con la contraseña incluida.
Se usa para el respaldo semanal. Contiene la contraseña de la base de datos, así que tómala con cuidado.

**Dónde conseguirla:**
1. Supabase → **Settings → Database → Connection string**.
2. Selecciona la pestaña **Session pooler** (importante: no "Direct connection", porque los servidores de GitHub solo tienen IPv4).
3. La URL tiene este formato:
   ```
   postgresql://postgres.axqhjdfwoinnjlvtbapg:[TU_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. Sustituye `[TU_PASSWORD]` con la contraseña que pusiste al crear el proyecto en Supabase. Si no la recuerdas, puedes resetearla en **Settings → Database → Reset database password**.

> **Nunca** compartas ni imprimas esta URL. La contraseña de la base de datos está dentro.

---

### Secreto 4: `BACKUP_PASSPHRASE`

**Qué es:** una contraseña fuerte que se usa para cifrar los archivos de respaldo con GPG.

**Cómo generar una buena clave:**
- En PowerShell, ejecuta este comando y copia el resultado:
  ```powershell
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
  ```
  Genera una clave aleatoria de 32 caracteres con letras y números.
- Otra opción: usa el generador de tu gestor de contraseñas con 32+ caracteres, letras, números y símbolos.

**Dónde guardarla:**
- **Guárdala en un gestor de contraseñas** (Bitwarden, 1Password, el que uses) con la etiqueta "Nexpak – BACKUP_PASSPHRASE".
- Esta es la única llave para descifrar los respaldos. Si la pierdes, los backups son irrecuperables.
- No la guardes en un bloc de notas, en el escritorio ni en un chat.

### Probar los workflows manualmente

Una vez creados los cuatro secretos:

1. GitHub → **Actions** → selecciona "Keep Supabase alive" → haz clic en **Run workflow** → **Run workflow** (botón verde). Debe terminar en verde.
2. GitHub → **Actions** → selecciona "Respaldo semanal de la base de datos" → **Run workflow**. Tarda unos minutos; al terminar verás el artifact en la sección **Artifacts** de la ejecución.

---

## Paso 2 — Cloudflare Pages

### 2.1 Crear la cuenta

1. Ve a <https://cloudflare.com> y crea una cuenta gratuita con el correo del negocio.
2. Activa la verificación en dos pasos antes de continuar (ver **Paso 6**).

### 2.2 Conectar el repositorio

1. En el panel de Cloudflare, haz clic en **Workers & Pages** en el menú izquierdo.
2. Haz clic en **Create** → pestaña **Pages** → **Connect to Git**.
3. Autoriza el acceso a GitHub y selecciona el repositorio de Nexpak.
4. Haz clic en **Begin setup**.

### 2.3 Configurar el build

En la pantalla de configuración del proyecto:

| Campo | Valor |
|---|---|
| **Framework preset** | None (o Vite) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

### 2.4 Variables de entorno de producción

Antes de hacer el primer deploy, agrega las variables de entorno:

1. En la misma pantalla de configuración, abre la sección **Environment variables**.
2. Agrega las siguientes variables con sus valores reales (los mismos que en los secretos de GitHub):

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://axqhjdfwoinnjlvtbapg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | La clave anon de Supabase (la misma que `SUPABASE_ANON_KEY`) |
| `VITE_PUBLIC_URL` | La URL del dominio final, sin barra (ej. `https://nexpak.com`) |
| `NODE_VERSION` | `24` |

> `VITE_PUBLIC_URL` se usa para el QR del rótulo, el enlace de compartir y las etiquetas Open Graph.
> Sin esta variable las imágenes no aparecen bien al compartir por WhatsApp.

3. Haz clic en **Save and Deploy**. El primer build tarda entre 1 y 3 minutos.

---

## Paso 3 — Dominio personalizado

### 3.1 Agregar el dominio a Cloudflare

1. En el panel de Cloudflare, haz clic en **Add a site** (o **Add domain**).
2. Escribe el dominio que compraste en Namecheap (ej. `nexpak.com`) y haz clic en **Continue**.
3. Selecciona el plan **Free** y haz clic en **Continue**.
4. Cloudflare te mostrará dos **nameservers** con este formato: `xxx.ns.cloudflare.com` y `yyy.ns.cloudflare.com`. Cópialos.

### 3.2 Cambiar los nameservers en Namecheap

1. Entra a tu cuenta en <https://namecheap.com>.
2. Ve a **Domain List** → haz clic en **Manage** junto al dominio.
3. En la sección **Nameservers**, selecciona **Custom DNS**.
4. Pega los dos nameservers que te dio Cloudflare y guarda los cambios.
5. La propagación puede tardar entre 5 minutos y 48 horas (lo normal es menos de 1 hora).

### 3.3 Conectar el dominio al proyecto de Pages

Una vez que Cloudflare confirme que los nameservers están activos:

1. En Cloudflare → **Workers & Pages** → tu proyecto de Nexpak → **Custom domains**.
2. Haz clic en **Set up a custom domain**.
3. Escribe `nexpak.com` y haz clic en **Continue**. Cloudflare crea automáticamente el registro DNS.
4. Repite el proceso con `www.nexpak.com`. Cloudflare agregará una redirección de `www` al dominio principal.

> El certificado SSL se genera automáticamente y puede tardar hasta 24 horas en activarse.

---

## Paso 4 — Supabase Auth: cambiar las URLs

Después de tener el dominio funcionando, actualiza las URLs de autenticación para que el login del panel admin funcione correctamente.

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL**: cambia a `https://nexpak.com` (sin barra al final).
3. **Redirect URLs**: agrega `https://nexpak.com/**` y `https://www.nexpak.com/**`.
4. Haz clic en **Save**.

---

## Paso 5 — Lista de verificación después de publicar

Revisa cada punto desde el celular Y desde el computador:

- [ ] **Login:** entra a `https://nexpak.com/admin/login`, inicia sesión con tu cuenta de admin.
- [ ] **Crear un envío:** ve a `/admin/envios/nuevo`, llena el formulario completo y guarda. Copia la guía generada.
- [ ] **Rastreo público:** ve a `https://nexpak.com` y busca la guía que acabas de crear. Debe aparecer el mapa con el pin de la ubicación.
- [ ] **Tiempo real desde el celular:** cambia el estado del envío desde el computador mientras tienes abierta la página de rastreo en el celular. El estado debe actualizarse sin recargar.
- [ ] **QR del rótulo:** genera el rótulo PDF del envío (en el detalle del envío). Escanea el QR con el celular: debe abrir `https://nexpak.com/rastreo/[GUIA]`.
- [ ] **Vista previa en WhatsApp:** envía `https://nexpak.com` por WhatsApp y verifica que aparezca la imagen de vista previa (og:image).
- [ ] **Rutas dev en 404:** visita `https://nexpak.com/dev/marca` — debe mostrar una página de error (404), no la hoja de marca.
- [ ] **Cabeceras de seguridad:** ve a <https://securityheaders.com>, escribe `https://nexpak.com` y verifica que obtienes al menos una calificación **A**. Si algo falla, revisa `public/_headers`.

---

## Paso 6 — Seguridad de las cuentas

Antes de publicar, activa la **verificación en dos pasos (2FA)** en todas estas cuentas:

| Servicio | Dónde activarlo |
|---|---|
| **GitHub** | Settings → Password and authentication → Two-factor authentication |
| **Supabase** | Haz clic en tu avatar (arriba a la derecha) → Account settings → Security |
| **Cloudflare** | My Profile → Authentication → Two-Factor Authentication |
| **Namecheap** | Profile → Security → Two-Factor Authentication |
| **Gmail de Nexpak** | Cuenta de Google → Seguridad → Verificación en dos pasos |

Además:

- **Contraseña de la base de datos:** si la tienes anotada en un bloc de notas o en un chat, cámbiala ahora. Ve a Supabase → **Settings → Database → Reset database password**, genera una nueva y guárdala en tu gestor de contraseñas. Luego actualiza el secreto `SUPABASE_DB_URL` en GitHub con la nueva URL.
- **Clave de respaldo (`BACKUP_PASSPHRASE`):** si aún no está en un gestor de contraseñas, guárdala ahora. Es la única forma de descifrar los backups.

---

## Resumen de secretos y variables

| Dónde | Nombre | Fuente |
|---|---|---|
| GitHub Secret | `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| GitHub Secret | `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| GitHub Secret | `SUPABASE_DB_URL` | Supabase → Settings → Database → Session pooler |
| GitHub Secret | `BACKUP_PASSPHRASE` | Generada por ti, guardada en gestor de contraseñas |
| Cloudflare env | `VITE_SUPABASE_URL` | Igual que `SUPABASE_URL` |
| Cloudflare env | `VITE_SUPABASE_ANON_KEY` | Igual que `SUPABASE_ANON_KEY` |
| Cloudflare env | `VITE_PUBLIC_URL` | Tu dominio final, ej. `https://nexpak.com` |
| Cloudflare env | `NODE_VERSION` | `24` |
