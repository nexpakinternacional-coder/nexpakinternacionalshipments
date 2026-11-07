/**
 * scripts/verificar-csp.ts
 *
 * Verifica que no haya errores de CSP en las rutas públicas principales.
 * Debe ejecutarse contra el servidor de preview (wrangler pages dev dist --port 8788).
 *
 * Ejecutar: npx playwright test scripts/verificar-csp.ts
 */
import { test, expect, type ConsoleMessage } from '@playwright/test'

const BASE = 'http://localhost:8788'

const RUTAS = [
  { ruta: '/',             nombre: 'Home' },
  { ruta: '/admin/login',  nombre: 'Login' },
  { ruta: '/rastreo/NXPW6DRBZD', nombre: 'Rastreo (guía de prueba)' },
]

for (const { ruta, nombre } of RUTAS) {
  test(`CSP: "${nombre}" — sin errores de política de seguridad`, async ({ page }) => {
    const violaciones: string[] = []

    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text()
      if (
        msg.type() === 'error' &&
        (text.includes('Content Security Policy') ||
          text.includes('CSP') ||
          text.includes("Refused to") ||
          text.includes('blocked by'))
      ) {
        violaciones.push(text)
      }
    })

    page.on('pageerror', (err: Error) => {
      if (
        err.message.includes('Content Security Policy') ||
        err.message.includes('Refused to')
      ) {
        violaciones.push(err.message)
      }
    })

    await page.goto(`${BASE}${ruta}`)
    await page.waitForLoadState('networkidle')

    // Verifica contenido visible
    const textLength = await page.evaluate(() =>
      (document.getElementById('root')?.innerText ?? '').trim().length
    )
    expect(
      textLength,
      `"${nombre}": la página aparece en blanco`
    ).toBeGreaterThan(10)

    expect(
      violaciones,
      `"${nombre}": violaciones CSP:\n${violaciones.join('\n')}`
    ).toHaveLength(0)
  })
}
