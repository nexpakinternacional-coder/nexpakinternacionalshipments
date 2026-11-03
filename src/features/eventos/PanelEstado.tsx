import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Tables } from '../../lib/supabase'
import {
  ESTADOS,
  ESTADOS_EXCEPCION,
  ESTADOS_FINALES,
  FLUJO_NORMAL,
  indiceFlujo,
  siguienteEstadoSugerido,
  type EstadoEnvio,
} from '../../lib/estados'
import BadgeEstado from '../../components/BadgeEstado'
import { t } from '../../textos/es'

type Evento = Tables<'eventos_envio'>

export type EnvioParaMasivo = { id: string; estado_actual: EstadoEnvio }

type ConfirmType = 'final' | 'retroceso' | 'entregado'

interface BorradorPanel {
  estadoSeleccionado: EstadoEnvio
  ubicacion: string
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
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

function borrarBorrador(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {}
}

export interface PanelEstadoProps {
  envioId?: string
  estadoActual?: EstadoEnvio
  eventoEditar?: Evento | null
  modoMasivo?: boolean
  enviosMasivo?: EnvioParaMasivo[]
  onClose: () => void
  onGuardado: (resultado?: { actualizados: number; omitidos: number }) => void
}

export default function PanelEstado({
  envioId,
  estadoActual,
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

  const [ubicacionesFrecuentes, setUbicacionesFrecuentes] = useState<string[]>([])
  const [confirmsQueue, setConfirmsQueue] = useState<ConfirmType[]>([])
  const [excluirFinales, setExcluirFinales] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const prevEstadoRef = useRef(estadoSeleccionado)
  const notaPublicaRef = useRef(notaPublica)
  useEffect(() => {
    notaPublicaRef.current = notaPublica
  }, [notaPublica])

  useEffect(() => {
    if (esEdicion || modoMasivo) return
    if (estadoSeleccionado === prevEstadoRef.current) return
    const plantilla = t.eventos.plantillas[estadoSeleccionado]
    const esPlantillaActual = Object.values(t.eventos.plantillas).includes(notaPublicaRef.current)
    if (plantilla && esPlantillaActual) setNotaPublica(plantilla)
    prevEstadoRef.current = estadoSeleccionado
  }, [estadoSeleccionado, esEdicion, modoMasivo])

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('eventos_envio')
        .select('ubicacion')
        .not('ubicacion', 'is', null)
        .limit(500)
      if (!data) return
      const freq = new Map<string, number>()
      for (const row of data) {
        if (row.ubicacion) freq.set(row.ubicacion, (freq.get(row.ubicacion) ?? 0) + 1)
      }
      setUbicacionesFrecuentes(
        [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(e => e[0]),
      )
    }
    cargar()
  }, [])

  useEffect(() => {
    if (!storageKey) return
    guardarBorrador(storageKey, { estadoSeleccionado, ubicacion, notaPublica, notaInterna, fechaHora })
  }, [storageKey, estadoSeleccionado, ubicacion, notaPublica, notaInterna, fechaHora])

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
      if (queue.length > 0) {
        setConfirmsQueue(queue)
        return
      }
    }
    guardar()
  }

  function handleConfirmar() {
    const remaining = confirmsQueue.slice(1)
    if (remaining.length > 0) {
      setConfirmsQueue(remaining)
    } else {
      setConfirmsQueue([])
      guardar()
    }
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

  const sugerido =
    !modoMasivo && !esEdicion && estadoActual ? siguienteEstadoSugerido(estadoActual) : null

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
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-surface flex flex-col"
        style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-ink">
            {esEdicion ? t.eventos.editarEvento : t.eventos.actualizarEstado}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
            aria-label={t.comun.cerrar}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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

          {modoMasivo && enviosFinalesMasivo.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 mb-2">
                {enviosFinalesMasivo.length}{' '}
                {enviosFinalesMasivo.length === 1 ? 'envío está' : 'envíos están'} en estado final (entregado/devuelto).
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

          {!esEdicion && (
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                {t.eventos.nuevoEstado}
              </p>
              {sugerido && (
                <div className="mb-3">
                  <p className="text-xs text-ink-muted mb-1.5">{t.eventos.estadoSugerido}</p>
                  <button
                    type="button"
                    onClick={() => setEstadoSeleccionado(sugerido)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-colors cursor-pointer ${
                      estadoSeleccionado === sugerido
                        ? 'border-navy bg-navy/5'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    <BadgeEstado estado={sugerido} size="sm" />
                    {estadoSeleccionado === sugerido && (
                      <span className="ml-auto text-xs font-semibold text-navy">✓</span>
                    )}
                  </button>
                </div>
              )}
              <p className="text-xs text-ink-muted mb-1.5">{t.eventos.flujoNormal}</p>
              <div className="space-y-1.5 mb-3">
                {FLUJO_NORMAL.filter(e => e !== sugerido).map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEstadoSeleccionado(e)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      estadoSeleccionado === e
                        ? 'border-navy bg-navy/5'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    <BadgeEstado estado={e} size="sm" />
                    {estadoSeleccionado === e && (
                      <span className="ml-auto text-xs font-semibold text-navy">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted mb-1.5">{t.eventos.excepciones}</p>
              <div className="space-y-1.5">
                {ESTADOS_EXCEPCION.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEstadoSeleccionado(e)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      estadoSeleccionado === e
                        ? 'border-navy bg-navy/5'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    <BadgeEstado estado={e} size="sm" />
                    {estadoSeleccionado === e && (
                      <span className="ml-auto text-xs font-semibold text-navy">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {esEdicion && (
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                {t.rastreo.estadoActual}
              </p>
              <BadgeEstado estado={estadoSeleccionado} />
            </div>
          )}

          <div>
            <label
              className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5"
              htmlFor="panel-ubicacion"
            >
              {t.eventos.ubicacion}
            </label>
            <input
              id="panel-ubicacion"
              type="text"
              value={ubicacion}
              onChange={e => setUbicacion(e.target.value)}
              placeholder={t.eventos.ubicacionPlaceholder}
              list="panel-ubicacion-list"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
            <datalist id="panel-ubicacion-list">
              {ubicacionesFrecuentes.map(u => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5"
              htmlFor="panel-nota-publica"
            >
              {t.eventos.notaPublica}
            </label>
            <textarea
              id="panel-nota-publica"
              value={notaPublica}
              onChange={e => setNotaPublica(e.target.value)}
              placeholder={t.eventos.notaPublicaPlaceholder}
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5"
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
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5"
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
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={handleGuardar}
            disabled={cargando || confirmsQueue.length > 0}
            className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {cargando
              ? t.eventos.cargando
              : esEdicion
              ? t.eventos.botonGuardarEdicion
              : t.eventos.botonGuardar}
          </button>
          <button
            onClick={onClose}
            disabled={cargando}
            className="flex-1 py-2.5 border border-border text-ink text-sm rounded-lg hover:bg-canvas disabled:opacity-40 cursor-pointer transition-colors"
          >
            {t.comun.cancelar}
          </button>
        </div>
      </div>
    </>
  )
}
