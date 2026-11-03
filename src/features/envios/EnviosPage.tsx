import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Tables } from '../../lib/supabase'
import { ESTADOS, ESTADOS_EXCEPCION, FLUJO_NORMAL, type EstadoEnvio } from '../../lib/estados'
import { formatearGuia } from '../../lib/guia'
import { formatearFechaHora } from '../../lib/formato'
import BadgeEstado from '../../components/BadgeEstado'
import { SkeletonFilaTabla, SkeletonTarjeta } from '../../components/Skeleton'
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
>

type Filtro = 'todos' | 'excepciones' | EstadoEnvio

const POR_PAGINA = 20
const COLS =
  'id, guia, destinatario_nombre, destinatario_ciudad, destinatario_pais, estado_actual, tipo_servicio, created_at'

export default function EnviosPage() {
  const navigate = useNavigate()

  const [busquedaInput, setBusquedaInput] = useState('')
  const [busquedaFinal, setBusquedaFinal] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [pagina, setPagina] = useState(0)
  const [filas, setFilas] = useState<Fila[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaFinal(busquedaInput)
      setPagina(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaInput])

  function cambiarFiltro(f: Filtro) {
    setFiltro(f)
    setPagina(0)
  }

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

      if (busquedaFinal.trim()) {
        const guiaNorm = busquedaFinal.toUpperCase().replace(/[-\s]/g, '')
        q = q.or(
          `guia.ilike.%${guiaNorm}%,destinatario_nombre.ilike.%${busquedaFinal.trim()}%`,
        )
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
    return () => {
      cancelado = true
    }
  }, [busquedaFinal, filtro, pagina])

  const inicio = pagina * POR_PAGINA + 1
  const fin = Math.min((pagina + 1) * POR_PAGINA, total)
  const hayAnterior = pagina > 0
  const haySiguiente = fin < total
  const hayBusqueda = busquedaFinal.trim() !== '' || filtro !== 'todos'

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
        <h1 className="text-xl font-semibold text-ink">{t.envios.titulo}</h1>
        <Link
          to="/admin/envios/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-accent-strong text-white rounded-lg text-sm font-semibold hover:bg-accent transition-colors cursor-pointer"
        >
          <Plus size={15} strokeWidth={2} />
          <span className="hidden sm:inline">{t.envios.nuevo}</span>
        </Link>
      </div>

      {/* Filters */}
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
          value={filtro}
          onChange={e => cambiarFiltro(e.target.value as Filtro)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
        >
          <option value="todos">{t.envios.filtroTodos}</option>
          <optgroup label="Flujo normal">
            {FLUJO_NORMAL.map(e => (
              <option key={e} value={e}>
                {ESTADOS[e].etiqueta}
              </option>
            ))}
          </optgroup>
          <optgroup label="Excepciones">
            {ESTADOS_EXCEPCION.map(e => (
              <option key={e} value={e}>
                {ESTADOS[e].etiqueta}
              </option>
            ))}
          </optgroup>
          <option value="excepciones">{t.envios.filtroExcepciones}</option>
        </select>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">
                {t.envios.columnaGuia}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">
                {t.envios.columnaDestinatario}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide hidden md:table-cell">
                {t.envios.columnaDestino}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">
                {t.envios.columnaEstado}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide hidden lg:table-cell">
                {t.envios.columnaServicio}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide hidden lg:table-cell">
                {t.envios.columnaFecha}
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonFilaTabla key={i} />)
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EstadoVacio />
                </td>
              </tr>
            ) : (
              filas.map(fila => (
                <tr
                  key={fila.id}
                  className="border-b border-border last:border-0 hover:bg-canvas transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/envios/${fila.id}`)}
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-medium text-navy text-sm">
                      {formatearGuia(fila.guia)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-ink">{fila.destinatario_nombre}</td>
                  <td className="px-4 py-3.5 text-ink-muted hidden md:table-cell">
                    {fila.destinatario_ciudad}, {fila.destinatario_pais}
                  </td>
                  <td className="px-4 py-3.5">
                    <BadgeEstado estado={fila.estado_actual} />
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

      {/* Cards — mobile */}
      <div className="md:hidden space-y-2">
        {cargando ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonTarjeta key={i} />)
        ) : filas.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl">
            <EstadoVacio />
          </div>
        ) : (
          filas.map(fila => (
            <Link
              key={fila.id}
              to={`/admin/envios/${fila.id}`}
              className="block bg-surface border border-border rounded-lg p-4 hover:border-navy/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-mono font-medium text-navy text-sm">
                  {formatearGuia(fila.guia)}
                </span>
                <BadgeEstado estado={fila.estado_actual} size="sm" />
              </div>
              <p className="text-sm text-ink font-medium mb-0.5">{fila.destinatario_nombre}</p>
              <p className="text-xs text-ink-muted">
                {fila.destinatario_ciudad}, {fila.destinatario_pais}
              </p>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
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
    </div>
  )
}
