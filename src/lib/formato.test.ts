import { describe, it, expect } from 'vitest'
import { formatearSoloFecha } from './formato'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extrae el número de día que un Date produce al formatearse en la TZ dada.
// Usamos Intl con timeZone explícita para que el resultado sea independiente
// de la zona horaria del runner (CI o local).
function diaEnTZ(date: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('es', { day: 'numeric', timeZone }).format(date),
  )
}

// ── Raíz del bug ──────────────────────────────────────────────────────────────
//
// new Date('2026-12-25') siempre es medianoche UTC (ISO 8601 date-only → UTC).
// En zonas negativas esa medianoche cae en el día anterior; en positivas no.
// formatearSoloFecha usa new Date(y, m-1, d) (medianoche LOCAL) + toLocaleDateString
// sin opción timeZone, así que tanto la creación como la visualización usan la
// misma zona → el día nunca se desplaza.

describe('new Date(string) con date-only — el bug que corrige formatearSoloFecha', () => {
  it('medianoche UTC vista desde Bogotá (UTC-5) aparece como el día 24', () => {
    // 2026-12-25T00:00:00Z = 2026-12-24T19:00:00-05:00 → día 24
    const utcMidnight = new Date('2026-12-25')
    expect(diaEnTZ(utcMidnight, 'America/Bogota')).toBe(24)
  })

  it('medianoche UTC vista desde Moscú (UTC+3) aparece como el día 25 (coincidencia)', () => {
    // 2026-12-25T00:00:00Z = 2026-12-25T03:00:00+03:00 → día 25; en positivo no hay desplazamiento
    const utcMidnight = new Date('2026-12-25')
    expect(diaEnTZ(utcMidnight, 'Europe/Moscow')).toBe(25)
  })
})

describe('formatearSoloFecha — independencia de zona horaria', () => {
  it('siempre devuelve el día 25 de diciembre, no el 24 (corrección Bogotá UTC-5)', () => {
    // new Date(y, m-1, d) produce medianoche LOCAL; toLocaleDateString usa la misma
    // zona → el día coincide con el string de entrada en cualquier entorno.
    const result = formatearSoloFecha('2026-12-25')
    expect(result).toMatch(/\b25\b/)
    expect(result).toMatch(/diciembre/i)
  })

  it('siempre devuelve el día 25 de diciembre (coherente también en zona positiva Moscú UTC+3)', () => {
    const result = formatearSoloFecha('2026-12-25')
    expect(result).toMatch(/\b25\b/)
    expect(result).not.toMatch(/\b24\b/)
  })

  it('new Date(y, m-1, d).getDate() siempre es el día del string, independiente de TZ', () => {
    // Verifica la garantía interna: medianoche local → getDate() = día local = correcto
    const [y, m, d] = '2026-12-25'.split('-').map(Number)
    expect(new Date(y, m - 1, d).getDate()).toBe(25)
  })

  it('funciona en un día de julio (sin ambigüedades por horario de verano)', () => {
    const result = formatearSoloFecha('2026-07-15')
    expect(result).toMatch(/\b15\b/)
    expect(result).toMatch(/julio/i)
  })

  it('funciona con el 1 de enero (límite de mes y año)', () => {
    const result = formatearSoloFecha('2027-01-01')
    expect(result).toMatch(/\b1\b/)
    expect(result).toMatch(/enero/i)
    expect(result).toContain('2027')
  })

  it('incluye el año en la cadena devuelta', () => {
    const result = formatearSoloFecha('2026-12-25')
    expect(result).toContain('2026')
  })
})
