/**
 * scripts/db-tipos.mjs
 *
 * Regenera src/lib/database.types.ts desde el esquema remoto de Supabase,
 * elimina cualquier línea de advertencia del CLI que no sea TypeScript válido,
 * guarda en UTF-8 y verifica que el proyecto sigue compilando.
 *
 * Uso: npm run db:tipos
 *
 * El CLI de Supabase puede emitir líneas de aviso/deprecación en stdout
 * (ej. "Warning: --linked is deprecated…", "Target: project …") antes del
 * TypeScript real. Este script las descarta buscando la primera línea que
 * empiece con "export", que es siempre el inicio del contenido generado.
 */

import { execSync }    from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath }   from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEST = resolve(ROOT, 'src/lib/database.types.ts')

// ── 1. Generar tipos ──────────────────────────────────────────────────────────
// Intenta --remote (flag recomendado en CLI v4+); si falla, cae en --linked.
console.log('⏳  Generando tipos desde Supabase remoto…')

const flags = ['--remote', '--linked']
let raw
let usedFlag
for (const flag of flags) {
  try {
    raw = execSync(`npx supabase gen types typescript ${flag}`, {
      encoding: 'utf8',
      cwd: ROOT,
      // stdout capturado; stderr al terminal para que el usuario vea errores reales
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    usedFlag = flag
    break
  } catch {
    // Continúa con el siguiente flag
  }
}

if (raw === undefined) {
  console.error('❌  No se pudo generar los tipos con ninguno de los flags disponibles.')
  console.error('    Verifica que npx supabase esté disponible y que el proyecto esté enlazado.')
  process.exit(1)
}

// ── 2. Limpiar advertencias del CLI ───────────────────────────────────────────
// Descarta todo hasta la primera línea que comience con "export".
// Las advertencias del CLI nunca empiezan con esa palabra.
const lines = raw.split('\n')
const startIdx = lines.findIndex(l => /^export /.test(l))

if (startIdx === -1) {
  console.error('❌  La salida de supabase gen types no contiene TypeScript válido.')
  console.error('    Primeras 5 líneas recibidas:')
  lines.slice(0, 5).forEach(l => console.error('    ' + l))
  process.exit(1)
}

const skipped = startIdx
const output  = lines.slice(startIdx).join('\n').trimEnd() + '\n'

// ── 3. Guardar en UTF-8 ───────────────────────────────────────────────────────
writeFileSync(DEST, output, { encoding: 'utf8' })

const lineCount = output.split('\n').length
console.log(
  `✅  Tipos guardados (${lineCount} líneas, flag: ${usedFlag}` +
  (skipped > 0 ? `, ${skipped} línea${skipped > 1 ? 's' : ''} de advertencia eliminada${skipped > 1 ? 's' : ''}` : '') +
  ').',
)

// ── 4. Type check ─────────────────────────────────────────────────────────────
console.log('⏳  Verificando tipos con tsc…')
try {
  execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'inherit' })
} catch {
  console.error('\n❌  El type check falló. Revisa la salida de tsc arriba.')
  process.exit(1)
}
console.log('✅  Type check OK — todo en orden.')
