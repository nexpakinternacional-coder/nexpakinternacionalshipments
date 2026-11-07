import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Printer, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Tables } from '../../lib/supabase'
import { ESTADOS, ESTADOS_EXCEPCION, FLUJO_NORMAL, type EstadoEnvio } from '../../lib/estados'
import { formatearGuia } from '../../lib/guia'
import { formatearFechaHora } from '../../lib/formato'
import BadgeEstado from '../../components/BadgeEstado'
import { SkeletonFilaTabla, SkeletonTarjeta } from '../../components/Skeleton'
import PanelEstado, { type EnvioParaMasivo } from '../eventos/PanelEstado'
import { t } from '../../textos/es'

type Fila = Pick<
  Tables<'envios'>,
  | 'id'
  | 'guia'
  | 'destinatario_nombre'
  | 'destinatario_ciudad'
  | 'destinatario_pais'
  | 'estado_actual'
  | 'tipo_servicio'
  | 'created_at'
  | 'activo'
>

type Filtro = 'todos' | 'excepciones' | EstadoEnvio
type FiltroActividad = 'activos' | 'inactivos' | 'todos'

const POR_PAGINA = 20
const COLS =
  'id, guia, destinatario_nombre, destinatario_ciudad, destinatario_pais, estado_actual, tipo_servicio, created_at, activo'

export default function EnviosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Leer filtros iniciales desde URL (desde el dashboard o buscador global)
  const estadoParamInicial = searchParams.get('estado') as EstadoEnvio | null
  const filtroParamInicial = searchParams.get('filtro') as 'excepciones' | null
  const actividadParam = searchParams.get('actividad') as FiltroActividad | null
  const qParam = searchParams.get('q') ?? ''

  const [busquedaInput, setBusquedaInput] = useState(qParam)
  const [busquedaFinal, setBusquedaFinal] = useState(qParam)
  const [filtro, setFiltro] = useState<Filtro>(
    filtroParamInicial === 'excepciones'
      ? 'excepciones'
      : estadoParamInicial ?? 'todos',
  )
  const [filtroActividad, setFiltroActividad] = useState<FiltroActividad>(
    actividadParam ?? 'activos',
  )
  const [pagina, setPagina] = useState(0)
  const [filas, setFilas] = useState<Fila[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarPanelMasivo, setMostrarPanelMasivo] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)

  // Limpiar query params de URL después del montaje inicial (para que no persistan al navegar)
  useEffect(() => {
    if (searchParams.toString()) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaFinal(busquedaInput)
      setPagina(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaInput])

  function cambiarFiltro(f: Filtro) { setFiltro(f); setPagina(0) }
  function cambiarFiltroActividad(f: FiltroActividad) { setFiltroActividad(f); setPagina(0) }

  useEffect(() => {
    setSeleccionados(new Set())
  }, [busquedaFinal, filtro, filtroActividad, pagina])

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      const desde = pagina * POR_PAGINA
      const hasta = (pagina + 1) * POR_PAGINA - 1

      let q = supabase
        .from('envios')
        .select(COLS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(desde, hasta)

      if (filtroActividad === 'activos') q = q.eq('activo', true)
      else if (filtroActividad === 'inactivos') q = q.eq('activo', false)

      if (busquedaFinal.trim()) {
        const guiaNorm = busquedaFinal.toUpperCase().replace(/[-\s]/g, '')
        q = q.or(`guia.ilike.%${guiaNorm}%,destinatario_nombre.ilike.%${busquedaFinal.trim()}%`)
      }

      if (filtro === 'excepciones') {
        q = q.in('estado_actual', ESTADOS_EXCEPCION)
      } else if (filtro !== 'todos') {
        q = q.eq('estado_actual', filtro)
      }

      const { data, count, error } = await q
      if (cancelado) return
      if (!error) {
        setFilas((data as Fila[]) ?? [])
        setTotal(count ?? 0)
      }
      setCargando(false)
    }
    cargar()
    return () => { cancelado = true }
  }, [busquedaFinal, filtro, filtroActividad, pagina, refreshKey])

  const inicio = pagina * POR_PAGINA + 1
  const fin = Math.min((pagina + 1) * POR_PAGINA, total)
  const hayAnterior = pagina > 0
  const haySiguiente = fin < total
  const hayBusqueda = busquedaFinal.trim() !== '' || filtro !== 'todos' || filtroActividad !== 'activos'

  const filaActivasEnPagina = filas.filter(f => f.activo)
  const todasActiasSeleccionadas =
    filaActivasEnPagina.length > 0 && filaActivasEnPagina.every(f => seleccionados.has(f.id))

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodos() {
    const ids = filaActivasEnPagina.map(f => f.id)
    if (todasActiasSeleccionadas) {
      setSeleccionados(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next })
    } else {
      setSeleccionados(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next })
    }
  }

  function mostrarToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  function onResultadoMasivo(resultado?: { actualizados: number; omitidos: number }) {
    setMostrarPanelMasivo(false)
    setSeleccionados(new Set())
    if (resultado) mostrarToast(t.eventos.resultadoMasivo(resultado.actualizados, resultado.omitidos))
    setRefreshKey(k => k + 1)
  }

  async function handleImprimirMasivo() {
    const ids = [...seleccionados]
    if (!ids.length) return
    setImprimiendo(true)
    try {
      // Buscar datos completos solo de los seleccionados activos
      const { data } = await supabase.from('envios').select('*').in('id', ids).eq('activo', true)
      if (data?.length) {
        const { generarRotuloPdf } = await import('../../lib/rotulo')
        await generarRotuloPdf(data)
      }
    } finally {
      setImprimiendo(false)
    }
  }

  const conteoSeleccionados = seleccionados.size
  const enviosMasivo: EnvioParaMasivo[] = filas
    .filter(f => seleccionados.has(f.id))
    .map(f => ({ id: f.id, estado_actual: f.estado_actual }))

  function EstadoVacio() {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-ink-muted mb-4">
          {hayBusqueda ? t.envios.sinResultados : t.envios.sinEnvios}
        </p>
        {!hayBusqueda && (
          <Link
            to="/admin/envios/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-semibold hover:bg-accent transition-colors cursor-pointer"
          >
            <Plus size={15} strokeWidth={2} />
            {t.envios.sinEnviosBoton}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-navy">{t.envios.titulo}</h1>
        <Link
          to="/admin/envios/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-semibold hover:bg-accent transition-colors cursor-pointer"
        >
          <Plus size={15} strokeWidth={2} />
          <span className="hidden sm:inline">{t.envios.nuevo}</span>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search
            size={15}
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            type="text"
            value={busquedaInput}
            onChange={e => setBusquedaInput(e.target.value)}
            placeholder={t.envios.buscarPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
        </div>
        <select
          value={filtroActividad}
          onChange={e => cambiarFiltroActividad(e.target.value as FiltroActividad)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
        >
          <option value="activos">{t.envios.filtroActivos}</option>
          <option value="inactivos">{t.envios.filtroInactivos}</option>
          <option value="todos">{t.envios.filtroTodosActividad}</option>
        </select>
        <select
          value={filtro}
          onChange={e => cambiarFiltro(e.target.value as Filtro)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
        >
          <option value="todos">{t.envios.filtroTodos}</option>
          <optgroup label="Flujo normal">
            {FLUJO_NORMAL.map(e => (
              <option key={e} value={e}>{ESTADOS[e].etiqueta}</option>
            ))}
          </optgroup>
          <optgroup label="Excepciones">
            {ESTADOS_EXCEPCION.map(e => (
              <option key={e} value={e}>{ESTADOS[e].etiqueta}</option>
            ))}
          </optgroup>
          <option value="excepciones">{t.envios.filtroExcepciones}</option>
        </select>
      </div>

      {/* Tabla — desktop */}
      <div className="hidden md:block bg-surface border border-border-subtle rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={todasActiasSeleccionadas}
                  onChange={toggleTodos}
                  disabled={filaActivasEnPagina.length === 0}
                  aria-label={t.comun.seleccionarTodos}
                  className="cursor-pointer disabled:cursor-not-allowed"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">{t.envios.columnaGuia}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">{t.envios.columnaDestinatario}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide hidden md:table-cell">{t.envios.columnaDestino}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">{t.envios.columnaEstado}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide hidden lg:table-cell">{t.envios.columnaServicio}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide hidden lg:table-cell">{t.envios.columnaFecha}</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonFilaTabla key={i} />)
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0"><EstadoVacio /></td>
              </tr>
            ) : (
              filas.map(fila => (
                <tr
                  key={fila.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    fila.activo ? 'hover:bg-canvas cursor-pointer' : 'opacity-60 cursor-pointer'
                  }`}
                  onClick={() => navigate(`/admin/envios/${fila.id}`)}
                >
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(fila.id)}
                      onChange={() => toggleSeleccion(fila.id)}
                      disabled={!fila.activo}
                      className="cursor-pointer disabled:cursor-not-allowed"
                      aria-label={`Seleccionar ${fila.guia}`}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-medium text-navy text-sm">{formatearGuia(fila.guia)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-ink">{fila.destinatario_nombre}</td>
                  <td className="px-4 py-3.5 text-ink-muted hidden md:table-cell">
                    {fila.destinatario_ciudad}, {fila.destinatario_pais}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <BadgeEstado estado={fila.estado_actual} />
                      {!fila.activo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                          {t.envios.etiquetaInactivo}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted hidden lg:table-cell">
                    {fila.tipo_servicio === 'estandar' ? 'Estándar' : 'Express'}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted hidden lg:table-cell whitespace-nowrap">
                    {formatearFechaHora(fila.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — mobile */}
      <div className="md:hidden space-y-2">
        {cargando ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonTarjeta key={i} />)
        ) : filas.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl"><EstadoVacio /></div>
        ) : (
          filas.map(fila => (
            <div
              key={fila.id}
              className={`bg-surface border border-border-subtle rounded-2xl p-4 transition-colors ${
                fila.activo ? 'hover:border-navy/30' : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={seleccionados.has(fila.id)}
                  onChange={() => toggleSeleccion(fila.id)}
                  disabled={!fila.activo}
                  className="mt-1 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                  aria-label={`Seleccionar ${fila.guia}`}
                  onClick={e => e.stopPropagation()}
                />
                <Link to={`/admin/envios/${fila.id}`} className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono font-medium text-navy text-sm">{formatearGuia(fila.guia)}</span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <BadgeEstado estado={fila.estado_actual} size="sm" />
                      {!fila.activo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                          {t.envios.etiquetaInactivo}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-ink font-medium mb-0.5">{fila.destinatario_nombre}</p>
                  <p className="text-xs text-ink-muted">{fila.destinatario_ciudad}, {fila.destinatario_pais}</p>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {!cargando && total > POR_PAGINA && (
        <div className="flex items-center justify-between mt-4 pt-2">
          <p className="text-xs text-ink-muted">{t.envios.mostrandoTotal(inicio, fin, total)}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(p => p - 1)}
              disabled={!hayAnterior}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {t.envios.paginaAnterior}
            </button>
            <button
              onClick={() => setPagina(p => p + 1)}
              disabled={!haySiguiente}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {t.envios.paginaSiguiente}
            </button>
          </div>
        </div>
      )}

      {/* Barra de acciones masivas */}
      {conteoSeleccionados > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-navy text-white px-6 py-3 flex items-center gap-3 flex-wrap"
          style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.15)' }}
        >
          <span className="text-sm font-medium flex-1 min-w-0">
            {t.eventos.seleccionados(conteoSeleccionados)}
          </span>
          <button
            onClick={() => setMostrarPanelMasivo(true)}
            className="flex-shrink-0 px-4 py-2 bg-white text-navy text-sm font-semibold rounded-lg hover:bg-canvas cursor-pointer transition-colors"
          >
            {t.eventos.actualizarMasivo}
          </button>
          <button
            onClick={handleImprimirMasivo}
            disabled={imprimiendo}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white/15 text-white text-sm font-semibold rounded-lg hover:bg-white/25 disabled:opacity-50 cursor-pointer transition-colors"
          >
            <Printer size={14} strokeWidth={2} />
            {imprimiendo ? t.envios.generandoRotulo : t.envios.imprimirRotulos}
          </button>
          <button
            onClick={() => setSeleccionados(new Set())}
            className="flex-shrink-0 p-2 text-white/80 hover:text-white cursor-pointer transition-colors"
            aria-label={t.eventos.limpiarSeleccion}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Panel masivo */}
      {mostrarPanelMasivo && (
        <PanelEstado
          modoMasivo
          enviosMasivo={enviosMasivo}
          onClose={() => setMostrarPanelMasivo(false)}
          onGuardado={onResultadoMasivo}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm font-medium px-5 py-3 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}
