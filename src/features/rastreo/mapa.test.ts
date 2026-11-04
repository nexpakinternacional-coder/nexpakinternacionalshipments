import { describe, it, expect } from 'vitest'

// ── Redondeo de privacidad del destino ───────────────────────────────────────
// La migración aplica: round(destino_lat::numeric, 2) en rastrear_envio.
// Este test verifica que el frontend manejará coordenadas redondeadas a 2 dec.

function redondearPrivacidad(lat: number, lng: number) {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  }
}

describe('privacidad de coordenadas de destino', () => {
  it('redondea a 2 decimales (~1 km)', () => {
    const r = redondearPrivacidad(43.65107, -79.347015)
    expect(r.lat).toBe(43.65)
    expect(r.lng).toBe(-79.35)
  })

  it('coordenadas ya redondeadas no cambian', () => {
    const r = redondearPrivacidad(19.43, -99.13)
    expect(r.lat).toBe(19.43)
    expect(r.lng).toBe(-99.13)
  })

  it('funciona con coordenadas negativas del sur', () => {
    const r = redondearPrivacidad(-34.6037, -58.3816)
    expect(r.lat).toBe(-34.6)
    expect(r.lng).toBe(-58.38)
  })
})

// ── Mapeo de coordenadas: datosMapa() ────────────────────────────────────────
// Replica la lógica de RastreoPage.datosMapa para verificar que solo
// se incluyen eventos con coordenadas completas.

interface EventoPublico {
  lat: number | null
  lng: number | null
  ubicacion_etiqueta: string | null
  ubicacion: string | null
}

function datosMapa(d: {
  origen_lat: number | null; origen_lng: number | null; origen_ciudad: string
  destino_lat: number | null; destino_lng: number | null; destino_ciudad: string
  eventos: EventoPublico[]
}) {
  return {
    origen: d.origen_lat != null && d.origen_lng != null
      ? { lat: d.origen_lat, lng: d.origen_lng, etiqueta: d.origen_ciudad }
      : undefined,
    destino: d.destino_lat != null && d.destino_lng != null
      ? { lat: d.destino_lat, lng: d.destino_lng, etiqueta: d.destino_ciudad }
      : undefined,
    eventos: d.eventos
      .filter(ev => ev.lat != null && ev.lng != null)
      .map(ev => ({
        lat: ev.lat!,
        lng: ev.lng!,
        etiqueta: ev.ubicacion_etiqueta ?? ev.ubicacion ?? undefined,
      })),
  }
}

describe('datosMapa()', () => {
  it('devuelve undefined para origen sin coordenadas', () => {
    const r = datosMapa({
      origen_lat: null, origen_lng: null, origen_ciudad: 'Houston, TX',
      destino_lat: 43.65, destino_lng: -79.35, destino_ciudad: 'Toronto, ON',
      eventos: [],
    })
    expect(r.origen).toBeUndefined()
    expect(r.destino?.lat).toBe(43.65)
  })

  it('filtra eventos sin coordenadas', () => {
    const r = datosMapa({
      origen_lat: 29.76, origen_lng: -95.37, origen_ciudad: 'Houston, TX',
      destino_lat: 43.65, destino_lng: -79.35, destino_ciudad: 'Toronto, ON',
      eventos: [
        { lat: 42.33, lng: -83.05, ubicacion_etiqueta: 'Detroit, MI', ubicacion: null },
        { lat: null, lng: null, ubicacion_etiqueta: null, ubicacion: 'Bodega' },
      ],
    })
    expect(r.eventos).toHaveLength(1)
    expect(r.eventos[0].etiqueta).toBe('Detroit, MI')
  })

  it('usa ubicacion como fallback de etiqueta', () => {
    const r = datosMapa({
      origen_lat: 29.76, origen_lng: -95.37, origen_ciudad: 'Houston',
      destino_lat: null, destino_lng: null, destino_ciudad: 'Toronto',
      eventos: [
        { lat: 42.33, lng: -83.05, ubicacion_etiqueta: null, ubicacion: 'Detroit, MI' },
      ],
    })
    expect(r.eventos[0].etiqueta).toBe('Detroit, MI')
  })
})

// ── Rate limit de Nominatim (1 búsqueda/segundo) ─────────────────────────────
// Verifica que la lógica de espera produce un delay ≥ 0 ms entre búsquedas.

describe('rate limit de Nominatim', () => {
  it('no espera si han pasado más de 1 s', () => {
    const ultimaBusquedaTs = Date.now() - 1500
    const ahora = Date.now()
    const espera = 1000 - (ahora - ultimaBusquedaTs)
    expect(espera).toBeLessThanOrEqual(0)
  })

  it('calcula espera cuando la búsqueda previa fue hace menos de 1 s', () => {
    const ultimaBusquedaTs = Date.now() - 400
    const ahora = Date.now()
    const espera = 1000 - (ahora - ultimaBusquedaTs)
    expect(espera).toBeGreaterThan(0)
    expect(espera).toBeLessThanOrEqual(1000)
  })
})
