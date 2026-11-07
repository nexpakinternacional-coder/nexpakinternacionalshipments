import { useEffect, useRef, useState } from 'react'
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

export default function MapaEnvio({ datos, className = '' }: MapaEnvioProps) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef       = useRef<import('maplibre-gl').Map | null>(null)
  const cargadoRef    = useRef(false)
  const [errorMapa, setErrorMapa] = useState(false)

  const tieneCoordenadas =
    datos.origen || datos.destino || datos.eventos.length > 0

  useEffect(() => {
    if (!tieneCoordenadas || !contenedorRef.current || cargadoRef.current) return
    cargadoRef.current = true

    let mapa: import('maplibre-gl').Map | null = null

    cargarMapLibre().then((ml) => {
      if (!contenedorRef.current) return

      try {
        mapa = new ml.Map({
          container: contenedorRef.current,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          attributionControl: false,
          center: [0, 20],
          zoom: 2,
        })
        mapaRef.current = mapa

        mapa.addControl(
          new ml.AttributionControl({ compact: true }),
          'bottom-left',
        )
        mapa.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')

        mapa.on('error', () => setErrorMapa(true))

        mapa.on('load', () => {
          const todosPuntos: [number, number][] = []

          if (datos.origen) todosPuntos.push([datos.origen.lng, datos.origen.lat])
          for (const ev of datos.eventos) todosPuntos.push([ev.lng, ev.lat])
          if (datos.destino) todosPuntos.push([datos.destino.lng, datos.destino.lat])

          // Tramo recorrido (origen → eventos)
          const puntosRecorridos: [number, number][] = []
          if (datos.origen) puntosRecorridos.push([datos.origen.lng, datos.origen.lat])
          for (const ev of datos.eventos) puntosRecorridos.push([ev.lng, ev.lat])

          if (puntosRecorridos.length >= 2) {
            mapa!.addSource('recorrido', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: puntosRecorridos },
                properties: {},
              },
            })
            mapa!.addLayer({
              id: 'recorrido-linea',
              type: 'line',
              source: 'recorrido',
              paint: { 'line-color': NAVY, 'line-width': 3 },
              layout: { 'line-cap': 'round' },
            })
          }

          // Tramo pendiente (posición actual → destino)
          const ultimoEventoIdx = datos.eventos.length - 1
          const posActual =
            datos.eventos.length > 0 ? datos.eventos[ultimoEventoIdx] : datos.origen

          if (posActual && datos.destino) {
            mapa!.addSource('pendiente', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [posActual.lng, posActual.lat],
                    [datos.destino.lng, datos.destino.lat],
                  ],
                },
                properties: {},
              },
            })
            mapa!.addLayer({
              id: 'pendiente-linea',
              type: 'line',
              source: 'pendiente',
              layout: { 'line-cap': 'round' },
              paint: {
                'line-color': NAVY,
                'line-width': 2,
                'line-dasharray': [2, 5],
              },
            })
          }

          // Origen (círculo con borde azul marino)
          if (datos.origen) {
            const el = document.createElement('div')
            el.style.cssText = `
              width:14px;height:14px;border-radius:50%;
              background:#fff;border:3px solid ${NAVY};
              box-shadow:0 1px 4px rgba(0,0,0,0.25);
            `
            if (datos.origen.etiqueta) el.setAttribute('title', datos.origen.etiqueta)
            new ml.Marker({ element: el })
              .setLngLat([datos.origen.lng, datos.origen.lat])
              .addTo(mapa!)
          }

          // Destino (cuadrado con borde azul marino)
          if (datos.destino) {
            const el = document.createElement('div')
            el.style.cssText = `
              width:14px;height:14px;border-radius:3px;
              background:#fff;border:3px solid ${NAVY};
              box-shadow:0 1px 4px rgba(0,0,0,0.25);
            `
            if (datos.destino.etiqueta) el.setAttribute('title', datos.destino.etiqueta)
            new ml.Marker({ element: el })
              .setLngLat([datos.destino.lng, datos.destino.lat])
              .addTo(mapa!)
          }

          // Ubicación actual (pin naranja con halo)
          const ubicacionActual =
            datos.eventos.length > 0 ? datos.eventos[ultimoEventoIdx] : null
          if (ubicacionActual) {
            const wrap = document.createElement('div')
            wrap.style.cssText = 'position:relative;width:44px;height:52px;'
            const halo = document.createElement('div')
            halo.style.cssText = `
              position:absolute;top:0;left:0;right:0;bottom:8px;
              border-radius:50%;background:${ACCENT};opacity:0.18;
              transform:scale(1.6);pointer-events:none;
            `
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            svg.setAttribute('viewBox', '0 0 44 52')
            svg.setAttribute('width', '44')
            svg.setAttribute('height', '52')
            svg.innerHTML = `
              <path d="M22 2C13.16 2 6 9.16 6 18C6 30 22 50 22 50C22 50 38 30 38 18C38 9.16 30.84 2 22 2Z"
                fill="${ACCENT}" stroke="#fff" stroke-width="2"/>
              <circle cx="22" cy="17" r="6" fill="#fff"/>
            `
            if (ubicacionActual.etiqueta) svg.setAttribute('aria-label', ubicacionActual.etiqueta)
            wrap.appendChild(halo)
            wrap.appendChild(svg)
            new ml.Marker({ element: wrap, anchor: 'bottom' })
              .setLngLat([ubicacionActual.lng, ubicacionActual.lat])
              .addTo(mapa!)
          }

          // Encuadre automático
          if (todosPuntos.length === 1) {
            mapa!.setCenter(todosPuntos[0])
            mapa!.setZoom(10)
          } else if (todosPuntos.length >= 2) {
            const lngs = todosPuntos.map(p => p[0])
            const lats = todosPuntos.map(p => p[1])
            mapa!.fitBounds(
              [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ],
              { padding: 56, maxZoom: 14, duration: 0 },
            )
          }
        })
      } catch {
        setErrorMapa(true)
      }
    }).catch(() => setErrorMapa(true))

    return () => {
      mapa?.remove()
      mapaRef.current = null
      cargadoRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieneCoordenadas, JSON.stringify(datos)])

  if (!tieneCoordenadas) return null

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-border ${className}`}
      style={{ height: 300 }}
    >
      {errorMapa ? (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas text-sm text-ink-muted">
          No pudimos cargar el mapa
        </div>
      ) : (
        <>
          <div ref={contenedorRef} className="absolute inset-0 bg-[#D6E2EE]" />

          {/* Leyenda */}
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
            <span className="ml-auto text-[10px] opacity-70">
              © OpenFreeMap · © OpenStreetMap contributors
            </span>
          </div>
        </>
      )}
    </div>
  )
}
