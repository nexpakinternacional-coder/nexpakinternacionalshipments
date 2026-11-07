# Restauración de un respaldo de la base de datos

Guía paso a paso para Windows. Aplica cuando necesitas recuperar datos después de un incidente o migrar a un nuevo proyecto de Supabase.

---

## Requisitos previos

| Herramienta | Cómo instalarla |
|---|---|
| **Git for Windows** (incluye Bash) | <https://git-scm.com/download/win> — elige la opción que agrega Git Bash |
| **Gpg4win** (GPG para Windows) | <https://gpg4win.org/download.html> — solo instala "GnuPG" si no quieres el cliente gráfico |
| **CLI de Supabase** | `winget install Supabase.CLI` en PowerShell, o descarga el `.exe` desde <https://github.com/supabase/cli/releases/latest> |
| **psql** (opcional, para verificar) | Viene incluido con PostgreSQL: <https://www.postgresql.org/download/windows/> |

Verifica que `gpg` y `supabase` estén en el PATH abriendo una nueva ventana de PowerShell:

```powershell
gpg --version
supabase --version
```

---

## Paso 1 — Descargar el artifact desde GitHub

1. Ve al repositorio en GitHub.
2. Haz clic en **Actions** en el menú superior.
3. En el panel izquierdo selecciona el workflow **"Respaldo semanal de la base de datos"**.
4. Haz clic en la ejecución más reciente (o en la que corresponda a la fecha que quieres restaurar).
5. En la sección **Artifacts** al final de la página, haz clic en el nombre del artifact (ej. `backup-12345678`) para descargarlo como `.zip`.
6. Extrae el `.zip`. Dentro encontrarás un archivo con el nombre `backup-YYYY-MM-DD.tar.gz.gpg`.

---

## Paso 2 — Descifrar el archivo con GPG

Abre **Git Bash** (no PowerShell) y navega a la carpeta donde extrajiste el artifact:

```bash
cd /c/Users/TU_USUARIO/Downloads/backup-12345678
```

Descifra el archivo (te pedirá la contraseña guardada en el secret `BACKUP_PASSPHRASE`):

```bash
gpg --batch --passphrase-fd 0 --decrypt \
  --output backup-2024-01-07.tar.gz \
  backup-2024-01-07.tar.gz.gpg <<< "tu_contraseña_aquí"
```

> Si prefieres no escribir la contraseña en la línea de comandos, omite `--batch --passphrase-fd 0 <<< "..."` y GPG la pedirá de forma interactiva.

Extrae el `.tar.gz`:

```bash
tar -xzf backup-2024-01-07.tar.gz
```

Deberías ver tres archivos: `roles.sql`, `schema.sql` y `data.sql`.

---

## Paso 3 — Crear un proyecto nuevo en Supabase (si aplica)

Si estás migrando a un nuevo proyecto:

1. Ve a <https://supabase.com> → **New project**.
2. Elige la región **East US (N. Virginia)** para mantener la misma latencia.
3. Espera a que el proyecto se inicialice (aprox. 2 minutos).
4. Ve a **Settings → Database → Connection string → Session pooler** y copia la URL. Tiene este formato:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
   Guarda esta URL como `DB_URL` para los pasos siguientes.

---

## Paso 4 — Restaurar con la CLI de Supabase

Abre **Git Bash** en la carpeta donde están los archivos `.sql`:

```bash
# 1. Roles (usuarios y privilegios)
psql "$DB_URL" -f roles.sql

# 2. Esquema (tablas, funciones, triggers, enums, RLS…)
supabase db push --db-url "$DB_URL" < schema.sql

# 3. Datos
psql "$DB_URL" -f data.sql
```

> **Nota:** Si `supabase db push` lanza un error por conflictos con objetos existentes en el proyecto nuevo (ej. tablas de `auth` que Supabase crea automáticamente), usa directamente `psql` para los tres archivos:
> ```bash
> psql "$DB_URL" -f roles.sql
> psql "$DB_URL" -f schema.sql
> psql "$DB_URL" -f data.sql
> ```

---

## Paso 5 — Verificar la restauración

Conéctate a la base de datos y comprueba que los datos estén:

```bash
psql "$DB_URL" -c "SELECT COUNT(*) FROM envios;"
psql "$DB_URL" -c "SELECT COUNT(*) FROM eventos_envio;"
psql "$DB_URL" -c "SELECT COUNT(*) FROM configuracion_sitio;"
```

Prueba la función RPC que usa la vista pública:

```bash
psql "$DB_URL" -c "SELECT rastrear_envio('NXP0000000');"
```

(Sustituye `NXP0000000` por una guía real de tu base de datos.)

---

## Paso 6 — Actualizar las variables de entorno

Si creaste un proyecto nuevo, actualiza:

1. **Cloudflare Pages → Settings → Environment variables**: cambia `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores del nuevo proyecto (Supabase → Settings → API).
2. **GitHub → Settings → Secrets**: actualiza `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_DB_URL`.
3. En Supabase Auth del proyecto nuevo: actualiza **Site URL** y **Redirect URLs** con el dominio de producción.

Fuerza un nuevo deploy en Cloudflare Pages para que las variables nuevas tomen efecto.

---

## Notas de seguridad

- El secret `BACKUP_PASSPHRASE` es la única llave para descifrar los respaldos. **Guárdalo en un gestor de contraseñas** (Bitwarden, 1Password) fuera de GitHub.
- Los artifacts de GitHub se conservan **90 días**. Pasado ese plazo se eliminan automáticamente. Si necesitas retención mayor, descarga el `.gpg` manualmente y guárdalo en un lugar seguro (Drive, USB cifrada).
- Nunca subas los archivos `.sql` descifrados a ningún repositorio ni servicio en la nube sin cifrar.
