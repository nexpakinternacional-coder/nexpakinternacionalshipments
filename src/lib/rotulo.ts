import type { Database } from './database.types'
import { formatearGuia } from './guia'
import { formatearFecha, formatearSoloFecha, formatearPeso, formatearDimensiones } from './formato'
import logoNegroUrl from '../assets/marca/logo-horizontal-negro.svg?url'

type Envio = Database['public']['Tables']['envios']['Row']

const URL_BASE =
  (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ||
  window.location.origin

// 100 × 150 mm in points (1 mm = 2.8346 pt)
const W_PT = 283.46
const H_PT = 425.2

// Viewbox del logo horizontal: 365.88 × 68
const LOGO_ASPECTO = 365.88 / 68

async function rasterizarSvg(url: string, anchoPx: number, altoPx: number, escala = 4): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = anchoPx * escala
      canvas.height = altoPx * escala
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

export async function generarRotuloPdf(envios: Envio[]): Promise<void> {
  const [{ jsPDF }, { default: JsBarcode }, { default: QRCode }] = await Promise.all([
    import('jspdf'),
    import('jsbarcode'),
    import('qrcode'),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [W_PT, H_PT] })

  for (let idx = 0; idx < envios.length; idx++) {
    if (idx > 0) doc.addPage([W_PT, H_PT])
    await dibujarRotulo(doc, envios[idx], JsBarcode, QRCode)
  }

  doc.save(`rotulos-nexpak-${Date.now()}.pdf`)
}

type JsBarcodeType = (el: unknown, text: string, opts?: Record<string, unknown>) => void
type QRCodeType = {
  toDataURL(text: string, opts?: Record<string, unknown>): Promise<string>
}

async function dibujarRotulo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  envio: Envio,
  JsBarcode: JsBarcodeType,
  QRCode: QRCodeType,
): Promise<void> {
  const pad = 14
  const BLACK = '#000000'
  const GRAY  = '#444444'
  const guiaFormateada = formatearGuia(envio.guia)
  const servicio = envio.tipo_servicio === 'express' ? 'EXPRESS' : 'ESTÁNDAR'

  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.5)

  // ── Encabezado ──────────────────────────────────────────────────────────────
  // Logo horizontal negro rasterizado a 4× para nitidez en impresión
  const logoH = 20
  const logoW = Math.round(logoH * LOGO_ASPECTO)
  const logoPng = await rasterizarSvg(logoNegroUrl, logoW, logoH)
  doc.addImage(logoPng, 'PNG', pad, 10, logoW, logoH)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRAY)
  doc.text(servicio, W_PT - pad, 24, { align: 'right' })

  // Línea separadora encabezado
  doc.setLineWidth(1)
  doc.line(pad, 36, W_PT - pad, 36)
  doc.setLineWidth(0.5)

  // ── Número de guía ──────────────────────────────────────────────────────────
  doc.setFont('courier', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(BLACK)
  doc.text(guiaFormateada, W_PT / 2, 58, { align: 'center' })

  // ── Código de barras Code128 ────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, envio.guia, {
    format: 'CODE128',
    width: 1.6,
    height: 50,
    displayValue: false,
    margin: 0,
    background: '#FFFFFF',
    lineColor: '#000000',
  })
  const bW = W_PT - pad * 2
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', pad, 66, bW, 50)

  // ── Separador ───────────────────────────────────────────────────────────────
  let y = 126
  doc.line(pad, y, W_PT - pad, y)
  y += 10

  // ── Remitente ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(GRAY)
  doc.text('REMITENTE', pad, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(BLACK)
  doc.text(envio.remitente_nombre, pad, y)
  y += 11

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (envio.remitente_direccion) {
    const ls = doc.splitTextToSize(envio.remitente_direccion, W_PT - pad * 2 - 80)
    doc.text(ls, pad, y)
    y += ls.length * 10
  }
  doc.text(`${envio.remitente_ciudad}, ${envio.remitente_pais}`, pad, y)
  y += 10
  if (envio.remitente_telefono) {
    doc.text(envio.remitente_telefono, pad, y)
    y += 10
  }

  // ── Separador ───────────────────────────────────────────────────────────────
  y += 2
  doc.line(pad, y, W_PT - pad, y)
  y += 10

  // ── Destinatario ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(GRAY)
  doc.text('DESTINATARIO', pad, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BLACK)
  doc.text(envio.destinatario_nombre, pad, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (envio.destinatario_direccion) {
    const ls = doc.splitTextToSize(envio.destinatario_direccion, W_PT - pad * 2 - 80)
    doc.text(ls, pad, y)
    y += ls.length * 10
  }
  doc.text(`${envio.destinatario_ciudad}, ${envio.destinatario_pais}`, pad, y)
  y += 10
  if (envio.destinatario_telefono) {
    doc.text(envio.destinatario_telefono, pad, y)
    y += 10
  }

  // ── Separador ───────────────────────────────────────────────────────────────
  y += 2
  doc.line(pad, y, W_PT - pad, y)
  y += 10

  // ── Detalles del paquete ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(GRAY)
  doc.text('DETALLE DEL PAQUETE', pad, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(BLACK)

  if (envio.descripcion_contenido) {
    const ls = doc.splitTextToSize(envio.descripcion_contenido, W_PT - pad * 2 - 80)
    doc.text(ls, pad, y)
    y += ls.length * 10
  }

  const detalles: string[] = []
  if (envio.peso_kg != null) detalles.push(`Peso: ${formatearPeso(Number(envio.peso_kg))}`)
  if (envio.largo_cm && envio.ancho_cm && envio.alto_cm)
    detalles.push(`Dims: ${formatearDimensiones(Number(envio.largo_cm), Number(envio.ancho_cm), Number(envio.alto_cm))}`)
  if (detalles.length > 0) {
    doc.text(detalles.join('   '), pad, y)
    y += 10
  }

  doc.text(`Creado: ${formatearFecha(envio.created_at)}`, pad, y)
  if (envio.fecha_estimada_entrega) {
    doc.text(
      `Entrega est.: ${formatearSoloFecha(envio.fecha_estimada_entrega)}`,
      W_PT - pad,
      y,
      { align: 'right' },
    )
  }

  // ── QR code ─────────────────────────────────────────────────────────────────
  const urlRastreo = `${URL_BASE}/rastreo/${envio.guia}`
  const qrSize = 68
  const qrX = W_PT - pad - qrSize
  const qrY = H_PT - 24 - pad - qrSize - 12

  const qrImg = await QRCode.toDataURL(urlRastreo, {
    width: 128,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(BLACK)
  doc.text('Escanea para rastrear', qrX + qrSize / 2, qrY + qrSize + 9, { align: 'center' })

  // ── Pie ─────────────────────────────────────────────────────────────────────
  const urlMostrar = urlRastreo.replace(/^https?:\/\//, '')
  doc.setLineWidth(1)
  doc.line(pad, H_PT - 24, W_PT - pad, H_PT - 24)
  doc.setLineWidth(0.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(BLACK)

  const urlLines = doc.splitTextToSize(urlMostrar, W_PT - qrSize - pad * 3)
  const urlY = H_PT - 24 + 10
  doc.text(urlLines, pad, urlY)
}
