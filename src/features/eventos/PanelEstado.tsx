import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Tables } from '../../lib/supabase'
import SelectorUbicacion, { type UbicacionSeleccionada } from '../../components/SelectorUbicacion'
import {
  ESTADOS,
  ESTADOS_EXCEPCION,
  ESTADOS_FINALES,
  FLUJO_NORMAL,
  indiceFlujo,
  siguienteEstadoSugerido,
  type EstadoEnvio,
} from '../../lib/estados'
import { formatearGuia } from '../../lib/guia'
import { t } from '../../textos/es'

type Evento = Tables<'eventos_envio'>

export type EnvioParaMasivo = { id: string; estado_actual: EstadoEnvio }

type ConfirmType = 'final' | 'retroceso' | 'entregado'

interface BorradorPanel {
  estadoSeleccionado: EstadoEnvio
  ubicacion: string
  ubicacionMapa: UbicacionSeleccionada | null
  notaPublica: string
  notaInterna: string
  fechaHora: string
}

function localISO(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function leerBorrador(key: string): BorradorPanel | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as BorradorPanel) : null
  } catch {
    return null
  }
}

function guardarBorrador(key: string, data: BorradorPanel) {
  try { sessionStorage.setItem(key, JSON.stringify(data)) } catch {}
}

function borrarBorrador(key: string) {
  try { sessionStorage.removeItem(key) } catch {}
}

// Estados que probablemente aplican según la etapa actual
function estadosProbables(actual: EstadoEnvio | undefined): EstadoEnvio[] {
  const mapeo: Partial<Record<EstadoEnvio, EstadoEnvio[]>> = {
    guia_generada:          ['novedad'],
    recibido_origen:        ['novedad'],
    transito_internacional: ['novedad', 'retenido_aduana'],
    en_aduana:              ['retenido_aduana', 'novedad'],
    liberado_aduana:        ['novedad'],
    centro_distribucion:    ['intento_fallido', 'novedad'],
    en_reparto:             ['intento_fallido', 'novedad'],
    entregado:              ['devuelto'],
    retenido_aduana:        ['liberado_aduana', 'devuelto'],
    intento_fallido:        ['en_reparto', 'devuelto'],
    novedad:                ['en_reparto', 'devuelto'],
    devuelto:               ['novedad'],
  }
  return mapeo[actual ?? 'guia_generada'] ?? ['novedad', 'retenido_aduana']
}

export interface PanelEstadoProps {
  envioId?: string
  estadoActual?: EstadoEnvio
  guia?: string
  destinatario?: string
  eventoEditar?: Evento | null
  modoMasivo?: boolean
  enviosMasivo?: EnvioParaMasivo[]
  onClose: () => void
  onGuardado: (resultado?: { actualizados: number; omitidos: number }) => void
}

export default function PanelEstado({
  envioId,
  estadoActual,
  guia,
  destinatario,
  eventoEditar,
  modoMasivo = false,
  enviosMasivo,
  onClose,
  onGuardado,
}: PanelEstadoProps) {
  const esEdicion = !!eventoEditar

  const storageKey = esEdicion
    ? `borrador-panel-edicion-${eventoEditar!.id}`
    : modoMasivo || !envioId
    ? null
    : `borrador-panel-${envioId}`

  const estadoDefault = (): EstadoEnvio => {
    if (modoMasivo) return FLUJO_NORMAL[1]
    if (esEdicion) return eventoEditar!.estado
    const borrador = storageKey ? leerBorrador(storageKey) : null
    if (borrador) return borrador.estadoSeleccionado
    return (estadoActual ? siguienteEstadoSugerido(estadoActual) : null) ?? estadoActual ?? FLUJO_NORMAL[0]
  }

  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoEnvio>(estadoDefault)

  const [ubicacion, setUbicacion] = useState<string>(() => {
    if (esEdicion) return eventoEditar!.ubicacion ?? ''
    return storageKey ? (leerBorrador(storageKey)?.ubicacion ?? '') : ''
  })

  const [ubicacionMapa, setUbicacionMapa] = useState<UbicacionSeleccionada | null>(() => {
    if (esEdicion) {
      const ev = eventoEditar!
      if (ev.lat != null && ev.lng != null) {
        return { lat: ev.lat, lng: ev.lng, etiqueta: ev.ubicacion_etiqueta ?? ev.ubicacion ?? '' }
      }
      return null
    }
    return storageKey ? (leerBorrador(storageKey)?.ubicacionMapa ?? null) : null
  })

  const [notaPublica, setNotaPublica] = useState<string>(() => {
    if (esEdicion) return eventoEditar!.nota_publica ?? ''
    const borrador = storageKey ? leerBorrador(storageKey) : null
    if (borrador) return borrador.notaPublica
    const inicial = estadoDefault()
    return t.eventos.plantillas[inicial] ?? ''
  })

  const [notaInterna, setNotaInterna] = useState<string>(() => {
    if (esEdicion) return eventoEditar!.nota_interna ?? ''
    return storageKey ? (leerBorrador(storageKey)?.notaInterna ?? '') : ''
  })

  const [fechaHora, setFechaHora] = useState<string>(() => {
    if (esEdicion) {
      const d = new Date(eventoEditar!.ocurrido_en)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    return storageKey ? (leerBorrador(storageKey)?.fechaHora ?? localISO()) : localISO()
  })

  const [confirmsQueue, setConfirmsQueue] = useState<ConfirmType[]>([])
  const [excluirFinales, setExcluirFinales] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [verTodosEstados, setVerTodosEstados] = useState(false)

  const prevEstadoRef = useRef(estadoSeleccionado)
  const notaPublicaRef = useRef(notaPublica)
  useEffect(() => { notaPublicaRef.current = notaPublica }, [notaPublica])

  useEffect(() => {
    if (esEdicion || modoMasivo) return
    if (estadoSeleccionado === prevEstadoRef.current) return
    const plantilla = t.eventos.plantillas[estadoSeleccionado]
    const esPlantillaActual = Object.values(t.eventos.plantillas).includes(notaPublicaRef.current)
    if (plantilla && esPlantillaActual) setNotaPublica(plantilla)
    prevEstadoRef.current = estadoSeleccionado
  }, [estadoSeleccionado, esEdicion, modoMasivo])

  useEffect(() => {
    if (!storageKey) return
    guardarBorrador(storageKey, { estadoSeleccionado, ubicacion, ubicacionMapa, notaPublica, notaInterna, fechaHora })
  }, [storageKey, estadoSeleccionado, ubicacion, ubicacionMapa, notaPublica, notaInterna, fechaHora])

  function buildQueue(): ConfirmType[] {
    if (esEdicion || modoMasivo || !estadoActual) return []
    const queue: ConfirmType[] = []
    if (ESTADOS_FINALES.includes(estadoActual)) queue.push('final')
    const idxNuevo = indiceFlujo(estadoSeleccionado)
    const idxActual = indiceFlujo(estadoActual)
    if (idxNuevo !== -1 && idxActual !== -1 && idxNuevo < idxActual) queue.push('retroceso')
    if (estadoSeleccionado === 'entregado' && !ESTADOS_FINALES.includes(estadoActual)) queue.push('entregado')
    return queue
  }

  function handleGuardar() {
    if (confirmsQueue.length === 0) {
      const queue = buildQueue()
      if (queue.length > 0) { setConfirmsQueue(queue); return }
    }
    guardar()
  }

  function handleConfirmar() {
    const remaining = confirmsQueue.slice(1)
    if (remaining.length > 0) { setConfirmsQueue(remaining) } else { setConfirmsQueue([]); guardar() }
  }

  async function guardar() {
    setCargando(true)
    setError('')
    try {
      const ocurrido_en = new Date(fechaHora).toISOString()

      if (modoMasivo && enviosMasivo) {
        const ids = excluirFinales
          ? enviosMasivo.filter(e => !ESTADOS_FINALES.includes(e.estado_actual)).map(e => e.id)
          : enviosMasivo.map(e => e.id)
        const { data, error: err } = await supabase.rpc('registrar_evento_masivo', {
          p_envio_ids: ids,
          p_estado: estadoSeleccionado,
          p_ubicacion: ubicacion.trim(),
          p_nota_publica: notaPublica.trim(),
          p_nota_interna: notaInterna.trim(),
          p_ocurrido_en: ocurrido_en,
        })
        if (err) throw new Error(err.message)
        onGuardado(data as { actualizados: number; omitidos: number })
      } else if (esEdicion && eventoEditar) {
        const { error: err } = await supabase
          .from('eventos_envio')
          .update({
            ubicacion: ubicacion.trim() || null,
            ubicacion_etiqueta: ubicacionMapa?.etiqueta?.trim() || null,
            lat: ubicacionMapa?.lat ?? null,
            lng: ubicacionMapa?.lng ?? null,
            nota_publica: notaPublica.trim() || null,
            nota_interna: notaInterna.trim() || null,
            ocurrido_en,
          })
          .eq('id', eventoEditar.id)
        if (err) throw new Error(err.message)
        if (storageKey) borrarBorrador(storageKey)
        onGuardado()
      } else if (envioId) {
        const { error: err } = await supabase.from('eventos_envio').insert({
          envio_id: envioId,
          estado: estadoSeleccionado,
          ubicacion: ubicacion.trim() || null,
          ubicacion_etiqueta: ubicacionMapa?.etiqueta?.trim() || null,
          lat: ubicacionMapa?.lat ?? null,
          lng: ubicacionMapa?.lng ?? null,
          nota_publica: notaPublica.trim() || null,
          nota_interna: notaInterna.trim() || null,
          ocurrido_en,
        })
        if (err) throw new Error(err.message)
        if (storageKey) borrarBorrador(storageKey)
        onGuardado()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.eventos.error)
      setCargando(false)
    }
  }

  // ── Computed para la selección de estado ─────────────────────────────────────
  const sugerido =
    !modoMasivo && !esEdicion && estadoActual ? siguienteEstadoSugerido(estadoActual) : null

  const estadosRapidos: EstadoEnvio[] = !modoMasivo && !esEdicion
    ? sugerido
      ? [sugerido, ...estadosProbables(estadoActual).filter(e => e !== sugerido).slice(0, 2)]
      : estadosProbables(estadoActual).slice(0, 3)
    : []

  const todosLosEstados = [...FLUJO_NORMAL, ...ESTADOS_EXCEPCION]
  const estadosExtendidos = todosLosEstados.filter(e => !estadosRapidos.includes(e))

  const confirmTexto = (() => {
    const tipo = confirmsQueue[0]
    if (!tipo) return ''
    if (tipo === 'retroceso' && estadoActual) {
      return t.eventos.confirmarRetroceso(
        ESTADOS[estadoActual]?.etiqueta ?? estadoActual,
        ESTADOS[estadoSeleccionado]?.etiqueta ?? estadoSeleccionado,
      )
    }
    if (tipo === 'final' && estadoActual) {
      return t.eventos.confirmarEstadoFinal(ESTADOS[estadoActual]?.etiqueta ?? estadoActual)
    }
    if (tipo === 'entregado') return t.eventos.confirmarEntregado
    return ''
  })()

  const maxFecha = localISO()
  const enviosFinalesMasivo = modoMasivo
    ? (enviosMasivo ?? []).filter(e => ESTADOS_FINALES.includes(e.estado_actual))
    : []

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={esEdicion ? t.eventos.editarEvento : t.eventos.actualizarEstado}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-[480px] bg-surface flex flex-col border-l border-[#DDE3EC]"
        style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between px-7 py-5 border-b border-[#E3E8F0] flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-[22px] font-extrabold text-navy leading-tight">
              {esEdicion ? t.eventos.editarEvento : t.eventos.actualizarEstado}
            </h2>
            {!modoMasivo && guia && destinatario && (
              <span className="text-sm text-ink-muted">
                <span className="font-mono font-semibold text-navy">{formatearGuia(guia)}</span>
                {' · '}
                {destinatario}
              </span>
            )}
            {modoMasivo && enviosMasivo && (
              <span className="text-sm text-ink-muted">
                {enviosMasivo.length} envíos seleccionados
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-none w-11 h-11 flex items-center justify-center rounded-[10px] bg-canvas text-navy hover:bg-border-subtle transition-colors cursor-pointer mt-0.5"
            aria-label={t.comun.cerrar}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-6">

          {/* Cola de confirmaciones */}
          {confirmsQueue.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 mb-3">{confirmTexto}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmar}
                  disabled={cargando}
                  className="flex-1 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {t.comun.confirmar}
                </button>
                <button
                  onClick={() => setConfirmsQueue([])}
                  className="flex-1 py-2 border border-border text-ink text-sm rounded-lg hover:bg-canvas cursor-pointer transition-colors"
                >
                  {t.comun.cancelar}
                </button>
              </div>
            </div>
          )}

          {/* Aviso de finales en masivo */}
          {modoMasivo && enviosFinalesMasivo.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 mb-2">
                {enviosFinalesMasivo.length}{' '}
                {enviosFinalesMasivo.length === 1 ? 'envío está' : 'envíos están'} en estado final.
              </p>
              <label className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excluirFinales}
                  onChange={e => setExcluirFinales(e.target.checked)}
                  className="cursor-pointer"
                />
                Excluir los que ya están en estado final
              </label>
            </div>
          )}

          {/* ── Selección de estado ─────────────────────────────────────────── */}
          {esEdicion ? (
            <div>
              <p className="text-sm font-semibold text-ink mb-2">{t.rastreo.estadoActual}</p>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-canvas border border-border-subtle rounded-[10px]">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    ESTADOS[estadoSeleccionado]?.colorFondo ?? ''
                  } ${ESTADOS[estadoSeleccionado]?.colorTexto ?? ''}`}
                >
                  {ESTADOS[estadoSeleccionado]?.etiqueta ?? estadoSeleccionado}
                </span>
              </div>
            </div>
          ) : modoMasivo ? (
            /* Modo masivo: lista compacta de todos los estados */
            <div>
              <p className="text-sm font-semibold text-ink mb-3">{t.eventos.nuevoEstado}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {FLUJO_NORMAL.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEstadoSeleccionado(e)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-left transition-colors cursor-pointer ${
                      estadoSeleccionado === e
                        ? 'border-navy bg-icon-bg'
                        : 'border-border-subtle hover:border-navy/30 hover:bg-canvas'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        ESTADOS[e]?.colorFondo ?? 'bg-border'
                      }`}
                    />
                    <span className={`text-sm flex-1 ${estadoSeleccionado === e ? 'font-semibold text-navy' : 'text-ink'}`}>
                      {ESTADOS[e].etiqueta}
                    </span>
                    {estadoSeleccionado === e && (
                      <span className="text-xs font-semibold text-navy ml-auto">✓</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-border-subtle my-1" />
                {ESTADOS_EXCEPCION.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEstadoSeleccionado(e)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-left transition-colors cursor-pointer ${
                      estadoSeleccionado === e
                        ? 'border-navy bg-icon-bg'
                        : 'border-border-subtle hover:border-navy/30 hover:bg-canvas'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        ESTADOS[e]?.colorFondo ?? 'bg-border'
                      }`}
                    />
                    <span className={`text-sm flex-1 ${estadoSeleccionado === e ? 'font-semibold text-navy' : 'text-ink'}`}>
                      {ESTADOS[e].etiqueta}
                    </span>
                    {estadoSeleccionado === e && (
                      <span className="text-xs font-semibold text-navy ml-auto">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Modo normal: 3 botones rápidos + toggle ver todos */
            <div>
              <p className="text-sm font-semibold text-ink mb-3">{t.eventos.nuevoEstado}</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {estadosRapidos.map(e => {
                  const esSugerido = e === sugerido
                  const activo = estadoSeleccionado === e
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEstadoSeleccionado(e)}
                      className={`min-h-[52px] p-3 rounded-[10px] text-left flex flex-col gap-0.5 transition-colors cursor-pointer ${
                        activo
                          ? 'border-2 border-navy bg-icon-bg'
                          : 'border border-border-subtle bg-surface hover:border-navy/30 hover:bg-canvas'
                      }`}
                    >
                      {esSugerido && (
                        <span className="text-[11px] font-semibold text-accent-strong leading-none mb-0.5">
                          SUGERIDO
                        </span>
                      )}
                      <span
                        className={`text-sm leading-snug ${
                          activo ? 'font-semibold text-navy' : 'text-ink'
                        }`}
                      >
                        {ESTADOS[e].etiqueta}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setVerTodosEstados(v => !v)}
                className="text-sm text-navy hover:underline cursor-pointer"
              >
                {verTodosEstados ? 'Ocultar estados' : t.eventos.verTodosEstados}
              </button>
              {verTodosEstados && (
                <div className="mt-3 grid grid-cols-1 gap-1.5">
                  {estadosExtendidos.map((e, i) => {
                    const esPrimerExcepcion = i > 0 && !ESTADOS_EXCEPCION.includes(estadosExtendidos[i - 1]) && ESTADOS_EXCEPCION.includes(e)
                    const activo = estadoSeleccionado === e
                    return (
                      <div key={e}>
                        {(esPrimerExcepcion || (i === 0 && ESTADOS_EXCEPCION.includes(e))) && (
                          <div className="border-t border-border-subtle my-2" />
                        )}
                        <button
                          type="button"
                          onClick={() => { setEstadoSeleccionado(e); setVerTodosEstados(false) }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-left transition-colors cursor-pointer ${
                            activo
                              ? 'border-navy bg-icon-bg'
                              : 'border-border-subtle hover:border-navy/30 hover:bg-canvas'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              ESTADOS[e]?.colorFondo ?? 'bg-border'
                            }`}
                          />
                          <span className={`text-sm flex-1 ${activo ? 'font-semibold text-navy' : 'text-ink'}`}>
                            {ESTADOS[e].etiqueta}
                          </span>
                          {activo && (
                            <span className="text-xs font-semibold text-navy">✓</span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Ubicación ───────────────────────────────────────────────────── */}
          <div>
            <label
              className="block text-sm font-semibold text-ink mb-2"
              htmlFor="panel-ubicacion-texto"
            >
              {t.eventos.ubicacion}
            </label>
            <input
              id="panel-ubicacion-texto"
              type="text"
              value={ubicacion}
              onChange={e => setUbicacion(e.target.value)}
              placeholder={t.eventos.ubicacionPlaceholder}
              className="w-full px-3.5 py-3 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>

          <SelectorUbicacion
            valor={ubicacionMapa}
            onChange={(v) => {
              setUbicacionMapa(v)
              if (v && !ubicacion.trim()) setUbicacion(v.etiqueta)
            }}
          />

          {/* ── Nota para el cliente ─────────────────────────────────────── */}
          <div>
            <label
              className="block text-sm font-semibold text-ink mb-2"
              htmlFor="panel-nota-publica"
            >
              {t.eventos.notaPublica}
            </label>
            <textarea
              id="panel-nota-publica"
              value={notaPublica}
              onChange={e => setNotaPublica(e.target.value)}
              placeholder={t.eventos.notaPublicaPlaceholder}
              rows={2}
              className="w-full px-3.5 py-3 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* ── Nota interna ─────────────────────────────────────────────── */}
          <div>
            <label
              className="block text-sm font-semibold text-ink mb-2"
              htmlFor="panel-nota-interna"
            >
              {t.eventos.notaInterna}
            </label>
            <textarea
              id="panel-nota-interna"
              value={notaInterna}
              onChange={e => setNotaInterna(e.target.value)}
              placeholder={t.eventos.notaInternaPlaceholder}
              rows={2}
              className="w-full px-3.5 py-3 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* ── Fecha y hora ─────────────────────────────────────────────── */}
          <div>
            <label
              className="block text-sm font-semibold text-ink mb-2"
              htmlFor="panel-fecha"
            >
              {t.eventos.fechaHora}
            </label>
            <input
              id="panel-fecha"
              type="datetime-local"
              value={fechaHora}
              max={maxFecha}
              onChange={e => setFechaHora(e.target.value)}
              className="w-full px-3.5 py-3 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-3.5 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 py-4 border-t border-[#E3E8F0] flex-shrink-0">
          <button
            onClick={onClose}
            disabled={cargando}
            className="flex-1 min-h-12 py-0 border border-border-subtle text-ink text-sm rounded-[10px] hover:bg-canvas disabled:opacity-40 cursor-pointer transition-colors"
          >
            {t.comun.cancelar}
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando || confirmsQueue.length > 0}
            className="flex-[2] min-h-12 py-0 bg-accent-strong text-white text-sm font-semibold rounded-[10px] hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {cargando
              ? t.eventos.cargando
              : esEdicion
              ? t.eventos.botonGuardarEdicion
              : modoMasivo
              ? t.eventos.botonGuardar
              : t.eventos.botonGuardarYNotificar}
          </button>
        </div>
      </div>
    </>
  )
}
