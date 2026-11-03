import { describe, it, expect } from 'vitest'
import {
  FLUJO_NORMAL,
  ESTADOS_EXCEPCION,
  ESTADOS_FINALES,
  siguienteEstadoSugerido,
  indiceFlujo,
  type EstadoEnvio,
} from '../../lib/estados'

// Helper that mirrors the DB trigger logic for computing estado_actual
function calcularEstadoActual(
  eventos: Array<{ estado: EstadoEnvio; ocurrido_en: string; anulado: boolean }>,
): EstadoEnvio | null {
  const activos = eventos.filter(e => !e.anulado)
  if (activos.length === 0) return null
  return activos.sort(
    (a, b) => new Date(b.ocurrido_en).getTime() - new Date(a.ocurrido_en).getTime(),
  )[0].estado
}

// Helper that mirrors the confirmation queue logic in PanelEstado
function buildConfirmsQueue(
  estadoActual: EstadoEnvio,
  estadoSeleccionado: EstadoEnvio,
): Array<'final' | 'retroceso' | 'entregado'> {
  const queue: Array<'final' | 'retroceso' | 'entregado'> = []
  if (ESTADOS_FINALES.includes(estadoActual)) queue.push('final')
  const idxNuevo = indiceFlujo(estadoSeleccionado)
  const idxActual = indiceFlujo(estadoActual)
  if (idxNuevo !== -1 && idxActual !== -1 && idxNuevo < idxActual) queue.push('retroceso')
  if (estadoSeleccionado === 'entregado' && !ESTADOS_FINALES.includes(estadoActual)) {
    queue.push('entregado')
  }
  return queue
}

describe('siguienteEstadoSugerido', () => {
  it('devuelve el siguiente estado en flujo normal', () => {
    expect(siguienteEstadoSugerido('guia_generada')).toBe('recibido_origen')
    expect(siguienteEstadoSugerido('recibido_origen')).toBe('transito_internacional')
    expect(siguienteEstadoSugerido('en_reparto')).toBe('entregado')
  })

  it('devuelve null para el último estado del flujo (entregado)', () => {
    expect(siguienteEstadoSugerido('entregado')).toBeNull()
  })

  it('devuelve null para estados de excepción', () => {
    for (const estado of ESTADOS_EXCEPCION) {
      expect(siguienteEstadoSugerido(estado)).toBeNull()
    }
  })

  it('cubre todos los estados del flujo normal excepto el último', () => {
    const sinUltimo = FLUJO_NORMAL.slice(0, -1)
    for (const estado of sinUltimo) {
      expect(siguienteEstadoSugerido(estado)).not.toBeNull()
    }
  })
})

describe('indiceFlujo', () => {
  it('devuelve índice correcto para estados en el flujo', () => {
    expect(indiceFlujo('guia_generada')).toBe(0)
    expect(indiceFlujo('entregado')).toBe(FLUJO_NORMAL.length - 1)
  })

  it('devuelve -1 para estados de excepción', () => {
    expect(indiceFlujo('novedad')).toBe(-1)
    expect(indiceFlujo('retenido_aduana')).toBe(-1)
    expect(indiceFlujo('devuelto')).toBe(-1)
  })
})

describe('reglas de confirmación', () => {
  it('no requiere confirmación en transición normal', () => {
    const queue = buildConfirmsQueue('recibido_origen', 'transito_internacional')
    expect(queue).toHaveLength(0)
  })

  it('requiere confirmación de retroceso cuando el nuevo estado es anterior', () => {
    const queue = buildConfirmsQueue('transito_internacional', 'guia_generada')
    expect(queue).toContain('retroceso')
  })

  it('requiere confirmación de estado final cuando el actual es entregado', () => {
    const queue = buildConfirmsQueue('entregado', 'novedad')
    expect(queue).toContain('final')
  })

  it('requiere confirmación de estado final cuando el actual es devuelto', () => {
    const queue = buildConfirmsQueue('devuelto', 'en_reparto')
    expect(queue).toContain('final')
  })

  it('requiere confirmación de entregado cuando se selecciona entregado', () => {
    const queue = buildConfirmsQueue('en_reparto', 'entregado')
    expect(queue).toContain('entregado')
    expect(queue).not.toContain('retroceso')
    expect(queue).not.toContain('final')
  })

  it('no requiere entregado si el actual ya es final', () => {
    const queue = buildConfirmsQueue('devuelto', 'entregado')
    expect(queue).toContain('final')
    expect(queue).not.toContain('entregado')
  })

  it('retroceso no aplica si alguno de los estados es excepción', () => {
    // novedad (excepción) → guia_generada: no es retroceso porque novedad no está en FLUJO_NORMAL
    const queue = buildConfirmsQueue('novedad', 'guia_generada')
    expect(queue).not.toContain('retroceso')
  })

  it('acumula final + retroceso cuando aplican los dos', () => {
    const queue = buildConfirmsQueue('entregado', 'guia_generada')
    expect(queue).toContain('final')
    expect(queue).toContain('retroceso')
  })
})

describe('calcularEstadoActual (lógica del trigger DB)', () => {
  it('retorna el estado del evento más reciente no anulado', () => {
    const eventos = [
      { estado: 'guia_generada' as EstadoEnvio, ocurrido_en: '2026-11-01T10:00:00Z', anulado: false },
      { estado: 'recibido_origen' as EstadoEnvio, ocurrido_en: '2026-11-02T10:00:00Z', anulado: false },
      { estado: 'transito_internacional' as EstadoEnvio, ocurrido_en: '2026-11-03T10:00:00Z', anulado: false },
    ]
    expect(calcularEstadoActual(eventos)).toBe('transito_internacional')
  })

  it('ignora eventos anulados', () => {
    const eventos = [
      { estado: 'guia_generada' as EstadoEnvio, ocurrido_en: '2026-11-01T10:00:00Z', anulado: false },
      { estado: 'transito_internacional' as EstadoEnvio, ocurrido_en: '2026-11-03T10:00:00Z', anulado: true },
      { estado: 'recibido_origen' as EstadoEnvio, ocurrido_en: '2026-11-02T10:00:00Z', anulado: false },
    ]
    expect(calcularEstadoActual(eventos)).toBe('recibido_origen')
  })

  it('retorna null si todos los eventos están anulados', () => {
    const eventos = [
      { estado: 'guia_generada' as EstadoEnvio, ocurrido_en: '2026-11-01T10:00:00Z', anulado: true },
    ]
    expect(calcularEstadoActual(eventos)).toBeNull()
  })

  it('retorna null para lista vacía', () => {
    expect(calcularEstadoActual([])).toBeNull()
  })

  it('el evento con mayor ocurrido_en determina el estado aunque haya anulados más recientes', () => {
    const eventos = [
      { estado: 'entregado' as EstadoEnvio, ocurrido_en: '2026-11-05T10:00:00Z', anulado: true },
      { estado: 'en_reparto' as EstadoEnvio, ocurrido_en: '2026-11-04T10:00:00Z', anulado: false },
      { estado: 'centro_distribucion' as EstadoEnvio, ocurrido_en: '2026-11-03T10:00:00Z', anulado: false },
    ]
    expect(calcularEstadoActual(eventos)).toBe('en_reparto')
  })
})
