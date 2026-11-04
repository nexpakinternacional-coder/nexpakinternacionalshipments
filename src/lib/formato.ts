const FMT_ES = new Intl.NumberFormat('es-CO')
const FMT_KG  = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })
const FMT_CM  = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

export function formatearFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleDateString('es', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatearFechaHora(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatearPeso(kg: number): string {
  return `${FMT_KG.format(kg)} kg`
}

export function formatearDimensiones(largo: number, ancho: number, alto: number): string {
  return `${FMT_CM.format(largo)} × ${FMT_CM.format(ancho)} × ${FMT_CM.format(alto)} cm`
}

export function formatearMoneda(valor: number, moneda: string): string {
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: moneda }).format(valor)
  } catch {
    return `${FMT_ES.format(valor)} ${moneda}`
  }
}

export function formatearSoloFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
