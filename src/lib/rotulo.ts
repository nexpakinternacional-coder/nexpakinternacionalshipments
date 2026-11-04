import type { Database } from './database.types'
import { formatearGuia } from './guia'
import { formatearFecha } from './formato'

type Envio = Database['public']['Tables']['envios']['Row']

const URL_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_PUBLIC_URL?.replace(
    /\/$/,
    '',
  ) || window.location.origin

// 100 × 150 mm in points (1 mm = 2.8346 pt)
const W_PT = 283.46
const H_PT = 425.2

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
  const guiaFormateada = formatearGuia(envio.guia)
  const servicio = envio.tipo_servicio === 'express' ? 'EXPRESS' : 'ESTÁNDAR'
  const colorNavy = '#0F2D5E'

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFillColor(colorNavy)
  doc.rect(0, 0, W_PT, 44, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor('#FFFFFF')
  doc.text('NEXPAK', pad, 29)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(servicio, W_PT - pad, 29, { align: 'right' })

  // ── Número de guía ──────────────────────────────────────────────────────────
  doc.setFont('courier', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(colorNavy)
  doc.text(guiaFormateada, W_PT / 2, 68, { align: 'center' })

  // ── Código de barras Code128 ────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, envio.guia, {
    format: 'CODE128',
    width: 1.6,
    height: 50,
    displayValue: false,
    margin: 0,
  })
  const bW = W_PT - pad * 2
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', pad, 78, bW, 52)

  // ── Separador ───────────────────────────────────────────────────────────────
  let y = 142
  doc.setDrawColor('#D1D9E6')
  doc.setLineWidth(0.5)
  doc.line(pad, y, W_PT - pad, y)
  y += 10

  // ── Remitente ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#6B7280')
  doc.text('REMITENTE', pad, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor('#111827')
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
  y += 3
  doc.line(pad, y, W_PT - pad, y)
  y += 10

  // ── Destinatario ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#6B7280')
  doc.text('DESTINATARIO', pad, y)
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(colorNavy)
  doc.text(envio.destinatario_nombre, pad, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#111827')
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
  y += 3
  doc.line(pad, y, W_PT - pad, y)
  y += 10

  // ── Detalles del paquete ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#6B7280')
  doc.text('DETALLE DEL PAQUETE', pad, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#111827')

  if (envio.descripcion_contenido) {
    const ls = doc.splitTextToSize(envio.descripcion_contenido, W_PT - pad * 2 - 80)
    doc.text(ls, pad, y)
    y += ls.length * 10
  }

  const detalles: string[] = []
  if (envio.peso_kg != null) detalles.push(`Peso: ${envio.peso_kg} kg`)
  if (envio.largo_cm && envio.ancho_cm && envio.alto_cm)
    detalles.push(`${envio.largo_cm}×${envio.ancho_cm}×${envio.alto_cm} cm`)
  if (detalles.length > 0) {
    doc.text(detalles.join('   '), pad, y)
    y += 10
  }

  doc.text(`Creado: ${formatearFecha(envio.created_at)}`, pad, y)
  if (envio.fecha_estimada_entrega) {
    doc.text(
      `Est. entrega: ${formatearFecha(envio.fecha_estimada_entrega)}`,
      W_PT - pad,
      y,
      { align: 'right' },
    )
  }

  // ── QR code (async, awaited before save) ───────────────────────────────────
  const urlRastreo = `${URL_BASE}/rastreo/${envio.guia}`
  const qrSize = 70
  const qrX = W_PT - pad - qrSize
  const qrY = H_PT - 20 - pad - qrSize - 12

  const qrImg = await QRCode.toDataURL(urlRastreo, {
    width: 128,
    margin: 1,
    color: { dark: '#0F2D5E', light: '#FFFFFF' },
  })
  doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor('#6B7280')
  doc.text('Escanea para rastrear', qrX + qrSize / 2, qrY + qrSize + 9, { align: 'center' })

  // ── Pie ────────────────────────────────────────────────────────────────────
  doc.setFillColor(colorNavy)
  doc.rect(0, H_PT - 20, W_PT, 20, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor('#FFFFFF')
  doc.text(urlRastreo, W_PT / 2, H_PT - 7, { align: 'center' })
}
