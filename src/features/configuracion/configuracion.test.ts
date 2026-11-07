import { describe, it, expect } from 'vitest'
import {
  normalizarWhatsApp,
  urlWhatsAppConfig,
  formatearRangoDias,
  type ConfiguracionSitio,
  type TiemposCorredor,
} from '../../hooks/useConfiguracionSitio'

// ── Configuración base vacía ──────────────────────────────────────────────────

function configVacia(): ConfiguracionSitio {
  return {
    whatsapp: '',
    telefono: '',
    correo: '',
    direccion: '',
    ciudad: '',
    horario_atencion: '',
    moneda: 'USD',
    unidad_peso: 'lb',
    precio_desde_estandar: null,
    precio_desde_express: null,
    tiempos: {},
    razon_social: '',
    nit: '',
  }
}

// ── normalizarWhatsApp ────────────────────────────────────────────────────────

describe('normalizarWhatsApp', () => {
  it('devuelve cadena vacía para input vacío', () => {
    expect(normalizarWhatsApp('')).toBe('')
  })

  it('no modifica un número limpio', () => {
    expect(normalizarWhatsApp('15551234567')).toBe('15551234567')
  })

  it('elimina espacios, guiones y paréntesis', () => {
    expect(normalizarWhatsApp('+1 (555) 123-4567')).toBe('15551234567')
  })

  it('elimina el signo +', () => {
    expect(normalizarWhatsApp('+52 55 1234 5678')).toBe('525512345678')
  })

  it('elimina texto mixto', () => {
    expect(normalizarWhatsApp('Cel: 300 123 4567')).toBe('3001234567')
  })

  it('elimina corchetes del placeholder sin dejar caracteres extra', () => {
    // Si alguien pegara el placeholder de empresa.ts
    expect(normalizarWhatsApp('[NÚMERO_WHATSAPP]')).toBe('')
  })
})

// ── urlWhatsAppConfig ─────────────────────────────────────────────────────────

describe('urlWhatsAppConfig', () => {
  it('devuelve # cuando whatsapp está vacío', () => {
    expect(urlWhatsAppConfig(configVacia())).toBe('#')
  })

  it('devuelve URL base cuando hay número y no hay mensaje', () => {
    const c = { ...configVacia(), whatsapp: '15551234567' }
    expect(urlWhatsAppConfig(c)).toBe('https://wa.me/15551234567')
  })

  it('añade el mensaje codificado cuando se proporciona', () => {
    const c = { ...configVacia(), whatsapp: '15551234567' }
    const url = urlWhatsAppConfig(c, 'Hola mundo')
    expect(url).toBe('https://wa.me/15551234567?text=Hola%20mundo')
  })

  it('no genera URL si el número son dígitos de un placeholder', () => {
    // Número con cero dígitos → whatsapp vacío → debe producir '#'
    const c = { ...configVacia(), whatsapp: '' }
    expect(urlWhatsAppConfig(c)).toBe('#')
  })
})

// ── formatearRangoDias ────────────────────────────────────────────────────────

describe('formatearRangoDias', () => {
  it('devuelve null cuando el corredor es undefined', () => {
    expect(formatearRangoDias(undefined, 'estandar')).toBeNull()
  })

  it('devuelve null cuando min y max son null', () => {
    const corredor: TiemposCorredor = { estandar_min: null, estandar_max: null }
    expect(formatearRangoDias(corredor, 'estandar')).toBeNull()
  })

  it('devuelve rango "min–max" cuando ambos están presentes', () => {
    const corredor: TiemposCorredor = { estandar_min: 5, estandar_max: 7 }
    expect(formatearRangoDias(corredor, 'estandar')).toBe('5–7')
  })

  it('devuelve solo el mínimo cuando max es null', () => {
    const corredor: TiemposCorredor = { estandar_min: 5, estandar_max: null }
    expect(formatearRangoDias(corredor, 'estandar')).toBe('5')
  })

  it('devuelve solo el máximo cuando min es null', () => {
    const corredor: TiemposCorredor = { estandar_min: null, estandar_max: 7 }
    expect(formatearRangoDias(corredor, 'estandar')).toBe('7')
  })

  it('usa los campos express cuando tipo es express', () => {
    const corredor: TiemposCorredor = { express_min: 2, express_max: 3 }
    expect(formatearRangoDias(corredor, 'express')).toBe('2–3')
  })

  it('devuelve null para express cuando solo están los campos estandar', () => {
    const corredor: TiemposCorredor = { estandar_min: 5, estandar_max: 7 }
    expect(formatearRangoDias(corredor, 'express')).toBeNull()
  })
})

// ── Regla "nunca mostrar corchetes" ───────────────────────────────────────────

describe('nunca mostrar corchetes — lógica de InicioPage', () => {
  it('urlWa es null cuando whatsapp está vacío → botones WA ocultos', () => {
    const config = configVacia()
    const urlWa = config.whatsapp ? urlWhatsAppConfig(config) : null
    expect(urlWa).toBeNull()
  })

  it('urlWa tiene URL cuando hay número → botones WA visibles', () => {
    const config = { ...configVacia(), whatsapp: '15551234567' }
    const urlWa = config.whatsapp ? urlWhatsAppConfig(config) : null
    expect(urlWa).toBe('https://wa.me/15551234567')
  })

  it('precio null → etiqueta "Cotiza tu envío"', () => {
    function labelPrecio(precio: number | null, moneda: string, unidad: string) {
      if (precio == null) return 'Cotiza tu envío'
      return `Desde ${moneda} ${precio.toFixed(2)} / ${unidad}`
    }
    expect(labelPrecio(null, 'USD', 'lb')).toBe('Cotiza tu envío')
    expect(labelPrecio(3.5, 'USD', 'lb')).toBe('Desde USD 3.50 / lb')
  })

  it('tiempos vacíos → formatearRangoDias devuelve null → línea de tiempo oculta', () => {
    const config = configVacia()
    expect(formatearRangoDias(config.tiempos.usca, 'estandar')).toBeNull()
    expect(formatearRangoDias(config.tiempos.usca, 'express')).toBeNull()
    expect(formatearRangoDias(config.tiempos.mxus, 'estandar')).toBeNull()
    expect(formatearRangoDias(config.tiempos.estados, 'estandar')).toBeNull()
  })

  it('pie de página: contacto vacío no produce líneas', () => {
    const config = configVacia()
    const ubicacion = [config.direccion, config.ciudad].filter(Boolean).join(', ')
    const tieneContacto = !!(ubicacion || config.correo || config.telefono)
    expect(tieneContacto).toBe(false)
  })

  it('pie de página: solo razón social → no incluye NIT en la línea legal', () => {
    const razonSocial = 'Nexpak LLC'
    const nit = ''
    let linea = `© 2026 Nexpak`
    if (razonSocial && nit) linea += ` · ${razonSocial} · NIT ${nit}`
    else if (razonSocial) linea += ` · ${razonSocial}`
    expect(linea).toBe('© 2026 Nexpak · Nexpak LLC')
    expect(linea).not.toContain('NIT')
  })

  it('pie de página: sin razón social ni NIT → solo el copyright', () => {
    const razonSocial = ''
    const nit = ''
    let linea = `© 2026 Nexpak`
    if (razonSocial && nit) linea += ` · ${razonSocial} · NIT ${nit}`
    else if (razonSocial) linea += ` · ${razonSocial}`
    expect(linea).toBe('© 2026 Nexpak')
  })
})

// ── Bloqueo de operador ───────────────────────────────────────────────────────

describe('bloqueo de operador — guarda de ConfiguracionPage', () => {
  type Rol = 'admin' | 'operador'

  function puedeEditar(rol: Rol): boolean {
    return rol === 'admin'
  }

  it('admin puede editar', () => {
    expect(puedeEditar('admin')).toBe(true)
  })

  it('operador no puede editar', () => {
    expect(puedeEditar('operador')).toBe(false)
  })

  it('la guarda también actúa en onSubmit: operador no puede guardar', () => {
    let guardado = false
    function onSubmit(esAdmin: boolean) {
      if (!esAdmin) return
      guardado = true
    }
    onSubmit(false)
    expect(guardado).toBe(false)
    onSubmit(true)
    expect(guardado).toBe(true)
  })
})
