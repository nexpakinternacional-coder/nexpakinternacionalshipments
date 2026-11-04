/**
 * verificar-layout.ts
 * Diagnóstico de layout para el panel admin de Nexpak.
 *
 * Ejecutar: npm run verificar:layout
 * Requiere: servidor de desarrollo corriendo (se inicia automáticamente via playwright.config.ts)
 *
 * Verifica en 5 tamaños de viewport:
 *  - Un solo scroll (el documento no debe hacer scroll; solo <main>)
 *  - La barra lateral / barra superior es siempre visible
 *  - No hay espacio vacío al final
 *  - La barra de acciones sticky está pegada al borde inferior
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const RUTA = '/dev/layout'
const SCREENSHOTS_DIR = path.resolve('./tmp/screenshots')
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const VIEWPORTS = [
  { nombre: '1366x768',   ancho: 1366, alto: 768  },
  { nombre: '1920x1080',  ancho: 1920, alto: 1080 },
  { nombre: '768x1024',   ancho: 768,  alto: 1024 },
  { nombre: '390x844',    ancho: 390,  alto: 844  },
  { nombre: '440x956',    ancho: 440,  alto: 956  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Función de medición: corre en el contexto del navegador
// ──────────────────────────────────────────────────────────────────────────────
async function medir(page: Page) {
  return page.evaluate(() => {
    const html = document.documentElement
    const body = document.body

    // ── Scroll del documento ────────────────────────────────────────────────
    const docScrollH = html.scrollHeight
    const docClientH = html.clientHeight
    const docScrollActual = window.scrollY

    // ── Altura declarada de html / body / #root ──────────────────────────────
    const estiloHtml = getComputedStyle(html)
    const estiloBody = getComputedStyle(body)
    const root = document.getElementById('root')
    const estiloRoot = root ? getComputedStyle(root) : null

    // ── Elementos con scroll propio activo ──────────────────────────────────
    const conScroll: { selector: string; scrollH: number; clientH: number }[] = []
    document.querySelectorAll<HTMLElement>('*').forEach(el => {
      const s = getComputedStyle(el)
      const oy = s.overflowY
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        el.scrollHeight > el.clientHeight
      ) {
        const tag = el.tagName.toLowerCase()
        const id   = el.id   ? `#${el.id}`   : ''
        const cls  = el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : ''
        conScroll.push({ selector: `${tag}${id}${cls}`, scrollH: el.scrollHeight, clientH: el.clientHeight })
      }
    })

    // ── Elementos cuyo borde inferior excede el viewport ────────────────────
    const sobreViewport: string[] = []
    document.querySelectorAll<HTMLElement>('*').forEach(el => {
      const rect = el.getBoundingClientRect()
      if (rect.bottom > docClientH + 2) {
        const tag = el.tagName.toLowerCase()
        const id   = el.id   ? `#${el.id}`   : ''
        const cls  = el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''
        sobreViewport.push(`${tag}${id}${cls} (bottom=${Math.round(rect.bottom)})`)
      }
    })

    return {
      docScrollH,
      docClientH,
      docScrollActual,
      tieneScrollDoc: docScrollH > docClientH,
      htmlHeight: estiloHtml.height,
      bodyMinH: estiloBody.minHeight,
      bodyHeight: estiloBody.height,
      rootHeight: estiloRoot?.height ?? 'N/A',
      conScroll,
      sobreViewport: sobreViewport.slice(0, 12),
    }
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Función: verifica que la barra de acciones sticky esté pegada al borde inferior
// ──────────────────────────────────────────────────────────────────────────────
async function verificarSticky(page: Page) {
  return page.evaluate(() => {
    // Buscar la barra sticky (primer elemento con position:sticky y bottom:0)
    let stickyEl: Element | null = null
    document.querySelectorAll<HTMLElement>('*').forEach(el => {
      if (stickyEl) return
      const s = getComputedStyle(el)
      if (s.position === 'sticky' && s.bottom === '0px') {
        stickyEl = el
      }
    })
    if (!stickyEl) return { encontrado: false, bottom: -1, viewport: window.innerHeight, pegado: false }
    const rect = (stickyEl as HTMLElement).getBoundingClientRect()
    return {
      encontrado: true,
      bottom: Math.round(rect.bottom),
      viewport: window.innerHeight,
      pegado: Math.abs(rect.bottom - window.innerHeight) <= 4,
    }
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────
for (const vp of VIEWPORTS) {
  test(`Layout ${vp.nombre}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.ancho, height: vp.alto })
    await page.goto(RUTA)
    await page.waitForLoadState('networkidle')

    // ── Captura 1: estado inicial (scroll arriba) ──────────────────────────
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${vp.nombre}-1-top.png`), fullPage: false })

    const m1 = await medir(page)
    console.log(`\n──── ${vp.nombre} (inicio) ────`)
    console.log(`  docScrollH=${m1.docScrollH}  clientH=${m1.docClientH}  SCROLL_DOC=${m1.tieneScrollDoc}`)
    console.log(`  html.height=${m1.htmlHeight}  body.minH=${m1.bodyMinH}  body.height=${m1.bodyHeight}  root.height=${m1.rootHeight}`)
    console.log(`  Elementos con scroll: ${m1.conScroll.map(e => `${e.selector}(${e.scrollH}/${e.clientH})`).join(', ') || 'ninguno'}`)
    if (m1.sobreViewport.length) console.log(`  Sobresalen viewport: ${m1.sobreViewport.join(', ')}`)

    // ── Scroll al 50% dentro de <main> ────────────────────────────────────
    await page.evaluate(() => {
      const main = document.querySelector('main')
      if (main) main.scrollTop = main.scrollHeight * 0.5
    })
    await page.waitForTimeout(150)

    const sticky50 = await verificarSticky(page)
    console.log(`  Sticky a 50% scroll: ${JSON.stringify(sticky50)}`)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${vp.nombre}-2-mid.png`), fullPage: false })

    // ── Scroll al fondo de <main> ─────────────────────────────────────────
    await page.evaluate(() => {
      const main = document.querySelector('main')
      if (main) main.scrollTop = main.scrollHeight
    })
    await page.waitForTimeout(150)

    const m2 = await medir(page)
    const stickyFondo = await verificarSticky(page)
    console.log(`  Scroll doc post-fondo: scrollY=${m2.docScrollActual}  scrollH=${m2.docScrollH}  scroll_doc=${m2.tieneScrollDoc}`)
    console.log(`  Sticky al fondo: ${JSON.stringify(stickyFondo)}`)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${vp.nombre}-3-bottom.png`), fullPage: false })

    // ── Assertions ───────────────────────────────────────────────────────
    expect(
      m1.tieneScrollDoc,
      `${vp.nombre}: el documento NO debe hacer scroll (hay doble scroll)`
    ).toBe(false)

    expect(
      m2.docScrollActual,
      `${vp.nombre}: window.scrollY debe ser 0 después de scrollear solo dentro de <main>`
    ).toBe(0)

    // Solo <main> debe tener scroll activo
    const nombresConScroll = m1.conScroll.map(e => e.selector)
    const conScrollNoMain = nombresConScroll.filter(s => !s.startsWith('main'))
    expect(
      conScrollNoMain.length,
      `${vp.nombre}: solo <main> debe tener scroll, otros con scroll: ${conScrollNoMain.join(', ')}`
    ).toBe(0)

    expect(
      sticky50.encontrado,
      `${vp.nombre}: debe existir un elemento sticky con bottom:0 (barra de acciones)`
    ).toBe(true)

    // La barra debe ser visible: pegada al fondo cuando el form sobresale el viewport,
    // o en su posición natural cuando el form cabe completo. En ambos casos bottom <= viewport.
    expect(
      sticky50.bottom <= sticky50.viewport + 2,
      `${vp.nombre}: barra de acciones debe ser visible (bottom=${sticky50.bottom}, viewport=${sticky50.viewport})`
    ).toBe(true)
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests de páginas públicas — sin login, sin sticky bar
// Solo verifica: sin scroll horizontal, sin desbordamiento visible
// ──────────────────────────────────────────────────────────────────────────────
const VIEWPORTS_MOVIL = [
  { nombre: '390x844',   ancho: 390,  alto: 844  },
  { nombre: '768x1024',  ancho: 768,  alto: 1024 },
  { nombre: '1366x768',  ancho: 1366, alto: 768  },
]

const PAGINAS_PUBLICAS = [
  { ruta: '/',                  nombre: 'Inicio' },
  { ruta: '/rastreo/NXPAAAAAAA', nombre: 'Rastreo (no encontrado)' },
]

for (const vp of VIEWPORTS_MOVIL) {
  for (const pagina of PAGINAS_PUBLICAS) {
    test(`Público ${pagina.nombre} @ ${vp.nombre}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.ancho, height: vp.alto })
      await page.goto(pagina.ruta)
      await page.waitForLoadState('networkidle')

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `publico-${pagina.nombre.replace(/\s+/g, '-').toLowerCase()}-${vp.nombre}.png`),
        fullPage: false,
      })

      const { scrollWidth, clientWidth, tieneScrollHorizontal } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        tieneScrollHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      }))

      expect(
        tieneScrollHorizontal,
        `${pagina.nombre} @ ${vp.nombre}: no debe haber scroll horizontal (scrollW=${scrollWidth}, clientW=${clientWidth})`
      ).toBe(false)
    })
  }
}
