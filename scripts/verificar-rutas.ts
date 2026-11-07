/**
 * scripts/verificar-rutas.ts
 *
 * Abre cada ruta de la app y falla si:
 *   1. Hay errores en la consola del navegador (SyntaxError, ReferenceError,
 *      módulo sin export, etc.) — exactamente el tipo de bug que dejó la app en blanco.
 *   2. La página queda en blanco (sin texto visible en #root).
 *
 * Ejecutar: npm run verificar:rutas
 * REGLA: correr siempre antes de reportar cualquier cambio como terminado.
 */
import { test, expect, type ConsoleMessage } from '@playwright/test'

const RUTAS = [
  { ruta: '/',                    nombre: 'Inicio' },
  { ruta: '/rastreo/INVALIDO',    nombre: 'Rastreo — guía inválida' },
  { ruta: '/admin/login',         nombre: 'Login admin' },
  { ruta: '/admin',               nombre: 'Dashboard (redirige a login)' },
  { ruta: '/admin/envios',        nombre: 'Envíos (redirige a login)' },
  { ruta: '/admin/envios/nuevo',       nombre: 'Nuevo envío (redirige a login)' },
  { ruta: '/admin/configuracion',      nombre: 'Configuración (redirige a login)' },
]

// Errores de red que son comportamiento esperado: auth checks, WebSocket, 401/403
const esErrorDeRed = (msg: string) =>
  /Failed to (fetch|load resource)/i.test(msg) ||
  /net::(ERR_|INTERNET_)/i.test(msg) ||
  /WebSocket/i.test(msg) ||
  /\b(401|403)\b/.test(msg) ||
  /supabase\.co.*network/i.test(msg)

for (const { ruta, nombre } of RUTAS) {
  test(`"${nombre}" — sin errores de consola ni página en blanco`, async ({ page }) => {
    const errores: string[] = []

    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' && !esErrorDeRed(msg.text())) {
        errores.push(`[console.error] ${msg.text()}`)
      }
    })

    page.on('pageerror', (err: Error) => {
      if (!esErrorDeRed(err.message)) {
        errores.push(`[uncaught] ${err.message}`)
      }
    })

    await page.goto(ruta)
    await page.waitForLoadState('networkidle')

    // Verifica que haya contenido visible (la app no quedó en blanco)
    const textLength = await page.evaluate(() =>
      (document.getElementById('root')?.innerText ?? '').trim().length
    )

    expect(
      textLength,
      `"${nombre}": la página aparece en blanco (sin contenido visible en #root)`
    ).toBeGreaterThan(10)

    expect(
      errores,
      `"${nombre}": errores en la consola del navegador:\n${errores.join('\n')}`
    ).toHaveLength(0)
  })
}
