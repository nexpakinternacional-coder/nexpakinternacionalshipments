import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { cargarMapLibre } from '../lib/maplibre'

export interface PuntoMapa {
  lat: number
  lng: number
  etiqueta?: string
}

export interface DatosMapa {
  origen?: PuntoMapa
  destino?: PuntoMapa
  eventos: PuntoMapa[]  // en orden cronológico; solo los que tengan coords
}

interface MapaEnvioProps {
  datos: DatosMapa
  className?: string
}

const NAVY   = '#0F2D5E'
const ACCENT = '#E8500A'

function calcPadding(el: HTMLElement): number {
  const { width, height } = el.getBoundingClientRect()
  const menor = Math.min(width || 300, height || 300)
  return Math.max(24, Math.min(60, Math.round(menor * 0.12)))
}

function puntosMapa(d: DatosMapa): [number, number][] {
  const pts: [number, number][] = []
  if (d.origen) pts.push([d.origen.lng, d.origen.lat])
  for (const ev of d.eventos) pts.push([ev.lng, ev.lat])
  if (d.destino) pts.push([d.destino.lng, d.destino.lat])
  return pts
}

function centroide(pts: [number, number][]): [number, number] {
  if (pts.length === 0) return [-90, 30]
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ]
}

function mkOrigenEl(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid ${NAVY};box-shadow:0 1px 4px rgba(0,0,0,0.25);`
  return el
}

function mkDestinoEl(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `width:14px;height:14px;border-radius:3px;background:#fff;border:3px solid ${NAVY};box-shadow:0 1px 4px rgba(0,0,0,0.25);`
  return el
}

function mkActualEl(etiqueta?: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:44px;height:52px;'
  const halo = document.createElement('div')
  halo.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:8px;border-radius:50%;background:${ACCENT};opacity:0.18;transform:scale(1.6);pointer-events:none;`
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 44 52')
  svg.setAttribute('width', '44')
  svg.setAttribute('height', '52')
  svg.innerHTML = `
    <path d="M22 2C13.16 2 6 9.16 6 18C6 30 22 50 22 50C22 50 38 30 38 18C38 9.16 30.84 2 22 2Z"
      fill="${ACCENT}" stroke="#fff" stroke-width="2"/>
    <circle cx="22" cy="17" r="6" fill="#fff"/>
  `
  if (etiqueta) svg.setAttribute('aria-label', etiqueta)
  wrap.appendChild(halo)
  wrap.appendChild(svg)
  return wrap
}

export default function MapaEnvio({ datos, className = '' }: MapaEnvioProps) {
  const contenedorRef   = useRef<HTMLDivElement>(null)
  const mapaRef         = useRef<import('maplibre-gl').Map | null>(null)
  const mlRef           = useRef<Awaited<ReturnType<typeof cargarMapLibre>> | null>(null)
  const cargadoRef      = useRef(false)
  const mapaListoRef    = useRef(false)
  const markerActualRef = useRef<import('maplibre-gl').Marker | null>(null)
  const datosRef        = useRef(datos)
  const [errorMapa, setErrorMapa] = useState(false)

  // Mantener ref sincronizada sin disparar efectos
  datosRef.current = datos

  const tieneCoordenadas = !!(datos.origen || datos.destino || datos.eventos.length > 0)

  const encuadrar = useCallback((animado = false) => {
    const mapa = mapaRef.current
    const el   = contenedorRef.current
    if (!mapa || !el) return

    const pts = puntosMapa(datosRef.current)
    if (pts.length === 0) return

    const padding = calcPadding(el)

    if (pts.length === 1) {
      mapa[animado ? 'easeTo' : 'jumpTo']({ center: pts[0], zoom: 6 })
    } else {
      const lngs = pts.map(p => p[0])
      const lats = pts.map(p => p[1])
      mapa.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding, maxZoom: 6, duration: animado ? 800 : 0 },
      )
    }
  }, [])

  // Crear el mapa una sola vez
  useEffect(() => {
    if (!tieneCoordenadas || !contenedorRef.current || cargadoRef.current) return
    cargadoRef.current = true

    let mapa: import('maplibre-gl').Map | null = null
    let resizeObserver: ResizeObserver | null  = null

    cargarMapLibre().then((ml) => {
      mlRef.current = ml
      if (!contenedorRef.current) return

      try {
        const pts    = puntosMapa(datosRef.current)
        const centro = centroide(pts)

        mapa = new ml.Map({
          container: contenedorRef.current,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          attributionControl: false,
          center: centro,
          zoom: 2,
          cooperativeGestures: true,
        })
        mapaRef.current = mapa

        mapa.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left')
        mapa.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
        mapa.on('error', () => setErrorMapa(true))

        mapa.on('load', () => {
          mapaListoRef.current = true
          const d = datosRef.current

          // Tramo recorrido (origen → eventos)
          const puntosRecorridos: [number, number][] = []
          if (d.origen) puntosRecorridos.push([d.origen.lng, d.origen.lat])
          for (const ev of d.eventos) puntosRecorridos.push([ev.lng, ev.lat])

          if (puntosRecorridos.length >= 2) {
            mapa!.addSource('recorrido', {
              type: 'geojson',
              data: { type: 'Feature', geometry: { type: 'LineString', coordinates: puntosRecorridos }, properties: {} },
            })
            mapa!.addLayer({
              id: 'recorrido-linea', type: 'line', source: 'recorrido',
              paint: { 'line-color': NAVY, 'line-width': 3 },
              layout: { 'line-cap': 'round' },
            })
          }

          // Tramo pendiente (posición actual → destino)
          const ultimoEvIdx = d.eventos.length - 1
          const posActual   = d.eventos.length > 0 ? d.eventos[ultimoEvIdx] : d.origen
          if (posActual && d.destino) {
            mapa!.addSource('pendiente', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [[posActual.lng, posActual.lat], [d.destino.lng, d.destino.lat]] },
                properties: {},
              },
            })
            mapa!.addLayer({
              id: 'pendiente-linea', type: 'line', source: 'pendiente',
              layout: { 'line-cap': 'round' },
              paint: { 'line-color': NAVY, 'line-width': 2, 'line-dasharray': [2, 5] },
            })
          }

          // Origen (círculo)
          if (d.origen) {
            const el = mkOrigenEl()
            if (d.origen.etiqueta) el.setAttribute('title', d.origen.etiqueta)
            new ml.Marker({ element: el })
              .setLngLat([d.origen.lng, d.origen.lat])
              .addTo(mapa!)
          }

          // Destino (cuadrado)
          if (d.destino) {
            const el = mkDestinoEl()
            if (d.destino.etiqueta) el.setAttribute('title', d.destino.etiqueta)
            new ml.Marker({ element: el })
              .setLngLat([d.destino.lng, d.destino.lat])
              .addTo(mapa!)
          }

          // Ubicación actual (pin naranja)
          const ubicActual = d.eventos.length > 0 ? d.eventos[ultimoEvIdx] : null
          if (ubicActual) {
            const el = mkActualEl(ubicActual.etiqueta)
            markerActualRef.current = new ml.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([ubicActual.lng, ubicActual.lat])
              .addTo(mapa!)
          }

          // Forzar redimensión del canvas antes de encuadrar
          mapa!.resize()
          encuadrar(false)

          // Re-encuadrar y redimensionar canvas al cambiar el tamaño del contenedor
          resizeObserver = new ResizeObserver(() => {
            if (mapaRef.current) {
              mapaRef.current.resize()
              encuadrar(false)
            }
          })
          resizeObserver.observe(contenedorRef.current!)
        })
      } catch {
        setErrorMapa(true)
      }
    }).catch(() => setErrorMapa(true))

    return () => {
      resizeObserver?.disconnect()
      mapa?.remove()
      mapaRef.current         = null
      mlRef.current           = null
      cargadoRef.current      = false
      mapaListoRef.current    = false
      markerActualRef.current = null
    }
  }, [tieneCoordenadas, encuadrar])

  // Actualizar mapa imperativo al llegar eventos nuevos (Broadcast)
  const datosKey     = JSON.stringify(datos)
  const prevDatosKey = useRef(datosKey)
  useEffect(() => {
    if (datosKey === prevDatosKey.current) return
    prevDatosKey.current = datosKey

    const mapa = mapaRef.current
    const ml   = mlRef.current
    if (!mapa || !ml || !mapaListoRef.current) return

    const d = datos

    // Actualizar fuente recorrido
    const puntosRecorridos: [number, number][] = []
    if (d.origen) puntosRecorridos.push([d.origen.lng, d.origen.lat])
    for (const ev of d.eventos) puntosRecorridos.push([ev.lng, ev.lat])

    const srcRec = mapa.getSource('recorrido') as import('maplibre-gl').GeoJSONSource | undefined
    if (srcRec) {
      srcRec.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: puntosRecorridos }, properties: {} })
    } else if (puntosRecorridos.length >= 2) {
      mapa.addSource('recorrido', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: puntosRecorridos }, properties: {} },
      })
      mapa.addLayer({
        id: 'recorrido-linea', type: 'line', source: 'recorrido',
        paint: { 'line-color': NAVY, 'line-width': 3 },
        layout: { 'line-cap': 'round' },
      })
    }

    // Actualizar fuente pendiente
    const ultimoEvIdx = d.eventos.length - 1
    const posActual   = d.eventos.length > 0 ? d.eventos[ultimoEvIdx] : d.origen
    const srcPend     = mapa.getSource('pendiente') as import('maplibre-gl').GeoJSONSource | undefined
    if (posActual && d.destino) {
      const coords: [number, number][] = [[posActual.lng, posActual.lat], [d.destino.lng, d.destino.lat]]
      if (srcPend) {
        srcPend.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} })
      } else {
        mapa.addSource('pendiente', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } })
        mapa.addLayer({
          id: 'pendiente-linea', type: 'line', source: 'pendiente',
          layout: { 'line-cap': 'round' },
          paint: { 'line-color': NAVY, 'line-width': 2, 'line-dasharray': [2, 5] },
        })
      }
    }

    // Mover / crear pin naranja
    const ubicActual = d.eventos.length > 0 ? d.eventos[ultimoEvIdx] : null
    if (ubicActual) {
      if (markerActualRef.current) {
        markerActualRef.current.setLngLat([ubicActual.lng, ubicActual.lat])
      } else {
        const el = mkActualEl(ubicActual.etiqueta)
        markerActualRef.current = new ml.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([ubicActual.lng, ubicActual.lat])
          .addTo(mapa)
      }
    } else if (markerActualRef.current) {
      markerActualRef.current.remove()
      markerActualRef.current = null
    }

    // Animación suave al nuevo encuadre
    encuadrar(true)
  }, [datosKey, encuadrar, datos])

  if (!tieneCoordenadas) return null

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-border bg-[#D6E2EE] ${className}`}
      style={{ height: 300 }}
    >
      {errorMapa ? (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas text-sm text-ink-muted">
          No pudimos cargar el mapa
        </div>
      ) : (
        <>
          {/* width/height 100% sobreviven cuando MapLibre inyecta position:relative */}
          <div ref={contenedorRef} style={{ width: '100%', height: '100%' }} />

          {/* Botón "Centrar en mi paquete" — debajo de los botones de zoom */}
          <button
            type="button"
            onClick={() => encuadrar(true)}
            aria-label="Centrar en mi paquete"
            title="Centrar en mi paquete"
            style={{
              position: 'absolute', top: 76, right: 10, zIndex: 2,
              width: 29, height: 29, padding: 0,
              background: '#fff', border: '1px solid rgba(0,0,0,0.3)',
              borderRadius: 4, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LocateFixed size={14} color="#333" strokeWidth={1.75} />
          </button>

          {/* Leyenda (atribución la muestra el control compacto de MapLibre) */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-3 py-2 text-xs text-[#374151] flex-wrap"
            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', zIndex: 1 }}
          >
            {datos.origen && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                  style={{ borderColor: NAVY, background: '#fff' }} />
                {datos.origen.etiqueta ?? 'Origen'}
              </span>
            )}
            {datos.eventos.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
                Ubicación actual
              </span>
            )}
            {datos.destino && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 flex-shrink-0"
                  style={{ borderRadius: 2, border: `2px solid ${NAVY}`, background: '#fff' }} />
                {datos.destino.etiqueta ?? 'Destino'}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
