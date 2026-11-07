import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader, MapPin, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cargarMapLibre } from '../lib/maplibre'

export interface UbicacionSeleccionada {
  lat: number
  lng: number
  etiqueta: string
}

interface SelectorUbicacionProps {
  valor: UbicacionSeleccionada | null
  onChange: (v: UbicacionSeleccionada | null) => void
  /** Puntos del recorrido previo (para contexto visual en el mapa) */
  recorrido?: { lat: number; lng: number }[]
  /** Muestra el encabezado de sección */
  label?: string
}

interface UbicacionDB {
  id: string
  etiqueta: string
  lat: number | null
  lng: number | null
  veces_usada: number
}

interface ResultadoNominatim {
  display_name: string
  lat: string
  lon: string
}

const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty'
const NAVY   = '#0F2D5E'
const ACCENT = '#E8500A'

// Límite: 1 búsqueda por segundo en Nominatim
let ultimaBusquedaTs = 0

function calcPadding(el: HTMLElement): number {
  const { width, height } = el.getBoundingClientRect()
  const menor = Math.min(width || 300, height || 280)
  return Math.max(24, Math.min(60, Math.round(menor * 0.12)))
}

export default function SelectorUbicacion({
  valor,
  onChange,
  recorrido = [],
  label = 'Ubicación del paquete',
}: SelectorUbicacionProps) {
  const [frecuentes, setFrecuentes] = useState<UbicacionDB[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ResultadoNominatim[]>([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [errorMapa, setErrorMapa] = useState(false)
  const [etiquetaEditable, setEtiquetaEditable] = useState(valor?.etiqueta ?? '')

  const contenedorRef = useRef<HTMLDivElement>(null)
  const mapaRef       = useRef<import('maplibre-gl').Map | null>(null)
  const marcadorRef   = useRef<import('maplibre-gl').Marker | null>(null)
  const cargadoRef    = useRef(false)

  // Sincronizar etiqueta editable con valor externo
  useEffect(() => {
    setEtiquetaEditable(valor?.etiqueta ?? '')
  }, [valor?.etiqueta])

  // Cargar ubicaciones frecuentes
  useEffect(() => {
    supabase
      .from('ubicaciones')
      .select('id,etiqueta,lat,lng,veces_usada')
      .eq('activa', true)
      .order('veces_usada', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setFrecuentes(data as UbicacionDB[])
      })
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!contenedorRef.current || cargadoRef.current) return
    cargadoRef.current = true

    let resizeObserver: ResizeObserver | null = null

    cargarMapLibre().then((ml) => {
      if (!contenedorRef.current) return

      try {
        const centro: [number, number] = valor
          ? [valor.lng, valor.lat]
          : recorrido.length > 0
          ? [recorrido[recorrido.length - 1].lng, recorrido[recorrido.length - 1].lat]
          : [-100, 23]

        const mapa = new ml.Map({
          container: contenedorRef.current,
          style: ESTILO_MAPA,
          center: centro,
          zoom: valor ? 10 : recorrido.length >= 2 ? 3 : 3,
          attributionControl: false,
        })
        mapaRef.current = mapa

        mapa.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left')
        mapa.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')

        mapa.on('load', () => {
          // Recorrido previo como contexto
          if (recorrido.length >= 2) {
            mapa.addSource('ctx-recorrido', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: recorrido.map(p => [p.lng, p.lat]) },
                properties: {},
              },
            })
            mapa.addLayer({
              id: 'ctx-recorrido-linea',
              type: 'line',
              source: 'ctx-recorrido',
              paint: { 'line-color': NAVY, 'line-width': 2, 'line-opacity': 0.4 },
            })

            // Encuadrar al recorrido completo si no hay valor seleccionado
            if (!valor && contenedorRef.current) {
              const pts = recorrido.map(p => [p.lng, p.lat] as [number, number])
              const lngs = pts.map(p => p[0])
              const lats = pts.map(p => p[1])
              mapa.fitBounds(
                [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                { padding: calcPadding(contenedorRef.current), maxZoom: 8, duration: 0 },
              )
            }
          }

          // Pin arrastrable
          if (valor) {
            colocarMarcador(ml, mapa, valor.lng, valor.lat)
          }

          // Clic en el mapa para colocar pin
          mapa.on('click', (e) => {
            const { lng, lat } = e.lngLat
            colocarMarcador(ml, mapa, lng, lat)
            const nueva: UbicacionSeleccionada = {
              lat: parseFloat(lat.toFixed(6)),
              lng: parseFloat(lng.toFixed(6)),
              etiqueta: etiquetaEditable,
            }
            onChange(nueva)
          })

          resizeObserver = new ResizeObserver(() => { mapa.resize() })
          if (contenedorRef.current) resizeObserver.observe(contenedorRef.current)
        })
      } catch { setErrorMapa(true) }
    }).catch(() => setErrorMapa(true))

    return () => {
      resizeObserver?.disconnect()
      mapaRef.current?.remove()
      mapaRef.current = null
      marcadorRef.current = null
      cargadoRef.current = false
    }
  // No se re-monta al cambiar valor; el pin se mueve en el efecto de abajo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mover pin cuando cambia el valor desde fuera
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !valor) return
    cargarMapLibre().then((ml) => {
      if (!mapaRef.current) return
      colocarMarcador(ml, mapaRef.current, valor.lng, valor.lat)
      mapaRef.current.easeTo({ center: [valor.lng, valor.lat], zoom: 10, duration: 500 })
    })
  }, [valor?.lat, valor?.lng])

  function colocarMarcador(
    ml: Awaited<ReturnType<typeof cargarMapLibre>>,
    mapa: import('maplibre-gl').Map,
    lng: number,
    lat: number,
  ) {
    if (marcadorRef.current) {
      marcadorRef.current.setLngLat([lng, lat])
      return
    }
    const el = document.createElement('div')
    el.innerHTML = `
      <svg viewBox="0 0 44 52" width="44" height="52" aria-hidden="true">
        <path d="M22 2C13.16 2 6 9.16 6 18C6 30 22 50 22 50C22 50 38 30 38 18C38 9.16 30.84 2 22 2Z"
          fill="${ACCENT}" stroke="#fff" stroke-width="2"/>
        <circle cx="22" cy="17" r="6" fill="#fff"/>
      </svg>
    `
    el.style.cursor = 'grab'
    const marker = new ml.Marker({ element: el, draggable: true, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(mapa)

    marker.on('dragend', () => {
      const { lng: lngN, lat: latN } = marker.getLngLat()
      const nueva: UbicacionSeleccionada = {
        lat: parseFloat(latN.toFixed(6)),
        lng: parseFloat(lngN.toFixed(6)),
        etiqueta: etiquetaEditable,
      }
      onChange(nueva)
    })
    marcadorRef.current = marker
  }

  // Búsqueda Nominatim — solo al presionar Buscar
  const handleBuscar = useCallback(async () => {
    if (!busqueda.trim()) return

    // 1. Buscar en nuestra tabla primero
    const { data: local } = await supabase
      .from('ubicaciones')
      .select('id,etiqueta,lat,lng,veces_usada')
      .eq('activa', true)
      .ilike('etiqueta', `%${busqueda.trim()}%`)
      .order('veces_usada', { ascending: false })
      .limit(5)

    if (local && local.length > 0) {
      const mapeoLocal: ResultadoNominatim[] = (local as UbicacionDB[])
        .filter(u => u.lat !== null && u.lng !== null)
        .map(u => ({
          display_name: u.etiqueta,
          lat: String(u.lat),
          lon: String(u.lng),
        }))
      if (mapeoLocal.length > 0) {
        setResultados(mapeoLocal)
        return
      }
    }

    // 2. Rate limit: 1 req/s
    const ahora = Date.now()
    const espera = 1000 - (ahora - ultimaBusquedaTs)
    if (espera > 0) await new Promise(r => setTimeout(r, espera))
    ultimaBusquedaTs = Date.now()

    setBuscando(true)
    setErrorBusqueda('')
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', busqueda.trim())
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('accept-language', 'es')
      url.searchParams.set('limit', '5')

      const resp = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'es' },
      })
      if (!resp.ok) throw new Error('Error de red')
      const data = (await resp.json()) as ResultadoNominatim[]
      setResultados(data)
      if (data.length === 0) setErrorBusqueda('Sin resultados. Puedes ubicar el pin directamente en el mapa.')
    } catch {
      setErrorBusqueda('No se pudo buscar ahora. Ubica el pin directamente en el mapa.')
    } finally {
      setBuscando(false)
    }
  }, [busqueda])

  function seleccionarResultado(r: ResultadoNominatim) {
    const lat = parseFloat(parseFloat(r.lat).toFixed(6))
    const lng = parseFloat(parseFloat(r.lon).toFixed(6))
    // Nombre limpio: primera parte hasta la primera coma (ej. "Windsor, Ontario, Canadá" → "Windsor, Ontario")
    const partes = r.display_name.split(',').map(s => s.trim())
    const etiqueta = partes.slice(0, 2).join(', ')
    const nueva: UbicacionSeleccionada = { lat, lng, etiqueta }
    onChange(nueva)
    setEtiquetaEditable(etiqueta)
    setResultados([])
    setBusqueda('')
  }

  function seleccionarFrecuente(u: UbicacionDB) {
    if (u.lat === null || u.lng === null) return
    const nueva: UbicacionSeleccionada = { lat: u.lat, lng: u.lng, etiqueta: u.etiqueta }
    onChange(nueva)
    setEtiquetaEditable(u.etiqueta)
  }

  function handleEtiquetaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEtiquetaEditable(e.target.value)
    if (valor) onChange({ ...valor, etiqueta: e.target.value })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
        {label}
      </p>

      {/* Búsqueda */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 min-h-[48px] px-3 border border-border rounded-lg bg-surface">
          <MapPin size={16} className="text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBuscar()}
            placeholder="Buscar ciudad…"
            className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none text-ink placeholder:text-ink-muted/50"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => { setBusqueda(''); setResultados([]) }}
              className="text-ink-muted hover:text-ink cursor-pointer"
              aria-label="Limpiar"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleBuscar}
          disabled={buscando || !busqueda.trim()}
          className="min-h-[48px] px-4 border border-navy rounded-lg text-sm font-semibold text-navy bg-surface hover:bg-navy/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-2"
        >
          {buscando ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
          Buscar
        </button>
      </div>

      {/* Error Nominatim */}
      {errorBusqueda && (
        <p className="text-xs text-ink-muted bg-canvas border border-border rounded-lg px-3 py-2">
          {errorBusqueda}
        </p>
      )}

      {/* Resultados Nominatim */}
      {resultados.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {resultados.map((r, i) => {
            const partes = r.display_name.split(',').map(s => s.trim())
            const nombre  = partes.slice(0, 2).join(', ')
            const detalle = partes.slice(2, 4).join(', ')
            return (
              <button
                key={i}
                type="button"
                onClick={() => seleccionarResultado(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-canvas transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium text-ink leading-tight">{nombre}</p>
                {detalle && <p className="text-xs text-ink-muted mt-0.5">{detalle}</p>}
              </button>
            )
          })}
        </div>
      )}

      {/* Chips frecuentes */}
      {frecuentes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-ink-muted">Usadas antes:</span>
          {frecuentes.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => seleccionarFrecuente(u)}
              className={`min-h-[32px] px-3 rounded-full border text-sm transition-colors cursor-pointer ${
                valor?.etiqueta === u.etiqueta
                  ? 'border-navy bg-navy/5 text-navy font-semibold'
                  : 'border-border bg-canvas text-ink hover:border-navy/40'
              }`}
            >
              {u.etiqueta}
            </button>
          ))}
        </div>
      )}

      {/* Mapa */}
      <div
        className="relative rounded-xl overflow-hidden border border-border bg-[#D6E2EE]"
        style={{ height: 280 }}
      >
        {errorMapa ? (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas text-sm text-ink-muted">
            No pudimos cargar el mapa
          </div>
        ) : (
          <>
            <div ref={contenedorRef} style={{ width: '100%', height: '100%' }} />

            {/* Instrucción */}
            {!valor && (
              <div
                className="absolute top-3 left-3 right-16 bg-navy text-white text-xs px-3 py-2 rounded-lg pointer-events-none"
                style={{ zIndex: 1 }}
              >
                Arrastra el pin o haz clic en el mapa para ubicar
              </div>
            )}
          </>
        )}
      </div>

      {/* Coordenadas + nombre visible al cliente */}
      {valor && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs text-ink-muted">
            {valor.lat.toFixed(4)}, {valor.lng.toFixed(4)}
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              Nombre que verá el cliente
            </label>
            <input
              type="text"
              value={etiquetaEditable}
              onChange={handleEtiquetaChange}
              placeholder="Ciudad, Estado"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setEtiquetaEditable('') }}
            className="self-start text-xs text-ink-muted hover:text-red-500 underline cursor-pointer transition-colors"
          >
            Quitar ubicación del mapa
          </button>
        </div>
      )}
    </div>
  )
}
