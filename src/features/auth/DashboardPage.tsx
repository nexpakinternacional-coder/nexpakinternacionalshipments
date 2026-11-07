import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PackageCheck, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import { formatearGuia } from '../../lib/guia'
import { ESTADOS, FLUJO_NORMAL, type EstadoEnvio } from '../../lib/estados'
import { Skeleton } from '../../components/Skeleton'
import { t } from '../../textos/es'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Indicadores {
  en_curso: number
  transito_internacional: number
  en_aduana: number
  con_excepcion: number
  entregados_30d: number
  creados_hoy: number
  creados_hoy_express: number
  creados_hoy_estandar: number
  sin_movimiento_5d: number
  porcentaje_a_tiempo: number | null
}

interface Movimiento {
  guia: string
  envio_id: string
  estado: string
  ubicacion: string | null
  ocurrido_en: string
  creado_por: string
}

interface Atencion {
  guia: string
  id: string
  estado_actual: string
  destinatario_nombre: string
  motivo: 'excepcion' | 'estancado'
  dias_sin_movimiento: number
}

interface Dia14 {
  fecha: string
  conteo: number
}

interface ResumenDashboard {
  indicadores: Indicadores
  por_estado: Record<string, number>
  ultimos_movimientos: Movimiento[]
  requieren_atencion: Atencion[]
  envios_14d: Dia14[]
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function saludoHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaEspanol(): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} días`
}

// ── Sección: Envíos en curso por etapa ───────────────────────────────────────

const ETAPAS_FLUJO = FLUJO_NORMAL.slice(0, 7) // excluye 'entregado'

const ETIQUETA_CORTA: Record<EstadoEnvio, string> = {
  guia_generada: 'Guía generada',
  recibido_origen: 'En bodega origen',
  transito_internacional: 'Tránsito int.',
  en_aduana: 'En aduana',
  liberado_aduana: 'Liberado',
  centro_distribucion: 'Centro distrib.',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  novedad: 'Novedad',
  retenido_aduana: 'Ret. aduana',
  intento_fallido: 'Intento fallido',
  devuelto: 'Devuelto',
}

function EnviosPorEtapa({
  porEstado,
  onFiltrar,
}: {
  porEstado: Record<string, number>
  onFiltrar: (estado: EstadoEnvio) => void
}) {
  const datos = ETAPAS_FLUJO.map(e => ({ estado: e, conteo: porEstado[e] ?? 0 }))
  const totalActivos = datos.reduce((s, d) => s + d.conteo, 0)
  const maxConteo = Math.max(...datos.map(d => d.conteo), 1)

  // Resaltar: en_aduana si tiene envíos, si no el que tenga más
  const resaltado: EstadoEnvio | null =
    (porEstado['en_aduana'] ?? 0) > 0
      ? 'en_aduana'
      : datos.reduce<typeof datos[0] | null>(
          (best, d) => (best === null || d.conteo > best.conteo ? d : best),
          null,
        )?.conteo
        ? (datos.reduce<typeof datos[0] | null>(
            (best, d) => (best === null || d.conteo > best.conteo ? d : best),
            null,
          )?.estado ?? null)
        : null

  return (
    <section
      aria-labelledby="flujo-titulo"
      className="bg-surface border border-[#DDE3EC] rounded-2xl p-6"
    >
      <div className="flex flex-wrap justify-between items-baseline gap-2 mb-5">
        <h2
          id="flujo-titulo"
          className="text-base font-semibold text-ink"
        >
          {t.dashboard.enviosEnCurso}
        </h2>
        <span className="text-sm text-ink-muted">
          <strong className="font-mono text-ink">{totalActivos}</strong>{' '}
          activos · clic en una etapa para filtrar
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {datos.map(({ estado, conteo }, i) => {
          const esResaltado = estado === resaltado && conteo > 0
          return (
            <button
              key={estado}
              type="button"
              onClick={() => onFiltrar(estado)}
              className={`flex flex-col gap-2.5 p-3.5 rounded-xl text-left transition-all cursor-pointer hover:shadow-sm ${
                esResaltado
                  ? 'bg-accent-soft border border-[#F4B08A]'
                  : 'bg-canvas hover:bg-canvas/80'
              }`}
            >
              <span
                className={`text-xs ${esResaltado ? 'text-[#9A3412]' : 'text-ink-muted'}`}
              >
                {i + 1} · {ETIQUETA_CORTA[estado]}
              </span>
              <strong
                className={`font-mono text-2xl font-semibold leading-none ${
                  esResaltado ? 'text-ink' : 'text-ink'
                }`}
              >
                {conteo}
              </strong>
              <span
                className="h-1 rounded-sm"
                style={{
                  width: `${Math.round((conteo / maxConteo) * 100)}%`,
                  minWidth: conteo > 0 ? '8%' : '0',
                  background: esResaltado ? '#E8500A' : '#0F2D5E',
                  opacity: conteo === 0 ? 0.2 : 1,
                }}
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ── Sección: 4 indicadores ────────────────────────────────────────────────────

function TarjetaKpi({
  titulo,
  valor,
  color,
  detalle,
  onClick,
}: {
  titulo: string
  valor: number
  color: string
  detalle?: string | null
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`bg-surface border border-[#DDE3EC] rounded-2xl p-5 flex flex-col gap-1.5 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all text-left' : ''
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <span className="text-sm text-ink-muted">{titulo}</span>
      <strong className={`font-mono text-[32px] font-semibold leading-none ${color}`}>
        {valor}
      </strong>
      {detalle != null && (
        <span className="text-sm text-ink-muted">{detalle}</span>
      )}
    </Tag>
  )
}

// ── Sección: Requieren atención ────────────────────────────────────────────────

function TablAtencion({
  items,
  onVerTodos,
  onVerItem,
}: {
  items: Atencion[]
  onVerTodos: () => void
  onVerItem: (id: string) => void
}) {
  return (
    <section
      aria-labelledby="atencion-titulo"
      className="bg-surface border border-[#DDE3EC] rounded-2xl flex flex-col flex-[3_1_460px] min-w-0"
    >
      <div className="px-6 py-4 flex justify-between items-center border-b border-[#E3E8F0]">
        <h2 id="atencion-titulo" className="text-base font-semibold text-ink">
          {t.dashboard.requierenAtencion}
        </h2>
        <button
          onClick={onVerTodos}
          className="text-sm text-navy hover:underline cursor-pointer"
        >
          {t.dashboard.verTodosAtencion}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
          <PackageCheck size={28} strokeWidth={1.5} className="text-green-400 mb-2" />
          <p className="text-sm text-ink-muted">{t.dashboard.sinAtencion}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm border-collapse"
            style={{ minWidth: 520 }}
          >
            <thead>
              <tr className="text-left text-xs text-ink-muted tracking-[0.06em] font-semibold">
                <th className="px-6 py-2.5">GUÍA</th>
                <th className="px-2 py-2.5">DESTINATARIO</th>
                <th className="px-2 py-2.5">MOTIVO</th>
                <th className="px-6 py-2.5 text-right">DESDE</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const badgeColor =
                  item.motivo === 'excepcion'
                    ? 'text-[#B91C1C] bg-[#FEECEC]'
                    : 'text-[#9A3412] bg-accent-soft'
                const etiqueta =
                  item.motivo === 'excepcion'
                    ? ESTADOS[item.estado_actual as EstadoEnvio]?.etiqueta ?? item.estado_actual
                    : t.dashboard.sinMovimientoMotivo
                return (
                  <tr
                    key={item.id}
                    className="border-t border-[#EEF1F5] hover:bg-canvas cursor-pointer transition-colors"
                    onClick={() => onVerItem(item.id)}
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-mono font-semibold text-navy whitespace-nowrap">
                        {formatearGuia(item.guia)}
                      </span>
                    </td>
                    <td className="px-2 py-3.5">{item.destinatario_nombre}</td>
                    <td className="px-2 py-3.5">
                      <span
                        className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}
                      >
                        {etiqueta}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-ink-muted whitespace-nowrap">
                      {item.dias_sin_movimiento}{' '}
                      {item.dias_sin_movimiento === 1 ? 'día' : 'días'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ── Sección: Últimos movimientos ───────────────────────────────────────────────

function UltimosMovimientos({
  movimientos,
  onVerItem,
  refresco,
}: {
  movimientos: Movimiento[]
  onVerItem: (id: string) => void
  refresco: number
}) {
  return (
    <section
      aria-labelledby="mov-titulo"
      className="bg-surface border border-[#DDE3EC] rounded-2xl flex flex-col flex-[2_1_320px] min-w-0"
    >
      <div className="px-6 py-4 flex justify-between items-center border-b border-[#E3E8F0]">
        <h2 id="mov-titulo" className="text-base font-semibold text-ink">
          {t.dashboard.ultimosMovimientos}
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#047857]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" aria-hidden="true" />
          {t.dashboard.enVivo}
          {/* key fuerza re-render visual en cada refresco */}
          <span key={refresco} className="sr-only">actualizado</span>
        </span>
      </div>
      {movimientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
          <Zap size={24} strokeWidth={1.5} className="text-ink-muted/40 mb-2" />
          <p className="text-sm text-ink-muted">{t.dashboard.sinMovimientos}</p>
        </div>
      ) : (
        <ul className="list-none m-0 px-6 py-2 flex flex-col divide-y divide-[#EEF1F5]">
          {movimientos.map((mov, idx) => (
            <li
              key={idx}
              className="py-3 flex flex-col gap-1 cursor-pointer hover:bg-canvas -mx-6 px-6 transition-colors"
              onClick={() => onVerItem(mov.envio_id)}
            >
              <div className="flex justify-between gap-2">
                <span className="font-mono font-semibold text-sm text-navy">
                  {formatearGuia(mov.guia)}
                </span>
                <span className="text-xs text-ink-muted whitespace-nowrap">
                  {tiempoRelativo(mov.ocurrido_en)}
                </span>
              </div>
              <span className="text-sm">
                {ESTADOS[mov.estado as EstadoEnvio]?.etiqueta ?? mov.estado}
                {mov.ubicacion ? ` · ${mov.ubicacion}` : ''}
              </span>
              <span className="text-xs text-ink-muted">por {mov.creado_por}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Sección: Gráfico 14 días ───────────────────────────────────────────────────

function Grafico14d({ datos }: { datos: Dia14[] }) {
  if (datos.length === 0) return null

  const max = Math.max(...datos.map(d => d.conteo), 1)
  const promedio = datos.reduce((s, d) => s + d.conteo, 0) / datos.length
  const hoy = new Date().toISOString().slice(0, 10)
  const primerFecha = datos[0]?.fecha ?? ''
  const fechaDisplay = (iso: string) => {
    const [,, d] = iso.split('-')
    return `${parseInt(d)} ${new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(iso))}`
  }

  const ariaLabel = `Gráfico de barras: envíos creados por día en los últimos 14 días. Promedio ${Math.round(promedio)} por día.`

  return (
    <section
      aria-labelledby="vol-titulo"
      className="bg-surface border border-[#DDE3EC] rounded-2xl p-6 flex flex-col gap-4"
    >
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <h2 id="vol-titulo" className="text-base font-semibold text-ink">
          {t.dashboard.envios14dTitulo}
        </h2>
        <span className="text-sm text-ink-muted">
          {t.dashboard.promedioPorDia(Math.round(promedio))}
        </span>
      </div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex items-end gap-1.5 h-36 border-b border-[#DDE3EC]"
      >
        {datos.map(({ fecha, conteo }) => {
          const esHoy = fecha === hoy
          const pct = Math.round((conteo / max) * 100)
          return (
            <div
              key={fecha}
              title={`${fechaDisplay(fecha)}: ${conteo}`}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max(pct, conteo > 0 ? 4 : 0)}%`,
                background: esHoy ? '#0F2D5E' : '#C3CCDA',
                minHeight: conteo > 0 ? 4 : 0,
              }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-ink-muted">
        <span>{fechaDisplay(primerFecha)}</span>
        <span>Hoy</span>
      </div>
    </section>
  )
}

// ── Estado vacío amable ────────────────────────────────────────────────────────

function EstadoVacioDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <PackageCheck size={48} strokeWidth={1} className="text-navy/20 mb-4" />
      <h2 className="font-display text-xl font-bold text-navy mb-2">
        Panel listo para operar
      </h2>
      <p className="text-sm text-ink-muted max-w-xs mb-6">
        Registra el primer envío para ver las estadísticas del panel aquí.
      </p>
      <Link
        to="/admin/envios/nuevo"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C2410C] text-white rounded-[10px] text-sm font-semibold hover:bg-accent transition-colors"
      >
        {t.envios.nuevo}
      </Link>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [refrescoMov, setRefrescoMov] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function cargar(silencioso = false) {
    if (!silencioso) setCargando(true)
    setError('')
    const { data, error: err } = await supabase.rpc('resumen_dashboard')
    if (err) {
      setError(t.dashboard.errorResumen)
      setCargando(false)
      return
    }
    setResumen(data as unknown as ResumenDashboard)
    setCargando(false)
  }

  // Carga inicial
  useEffect(() => {
    cargar()
  }, [])

  // Refresco de "últimos movimientos" cada 30 s (mientras la pestaña está visible)
  useEffect(() => {
    function iniciarIntervalo() {
      intervalRef.current = setInterval(() => {
        if (!document.hidden) {
          setRefrescoMov(n => n + 1)
          cargar(true)
        }
      }, 30_000)
    }
    iniciarIntervalo()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function irAListado(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params)
    navigate(`/admin/envios?${q.toString()}`)
  }

  if (cargando) {
    return (
      <div className="p-6 lg:p-8 flex flex-col gap-6">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="flex gap-4 flex-wrap">
          <Skeleton className="h-64 rounded-2xl flex-[3_1_460px]" />
          <Skeleton className="h-64 rounded-2xl flex-[2_1_320px]" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!resumen) return null

  const { indicadores, por_estado, ultimos_movimientos, requieren_atencion, envios_14d } = resumen

  const hayDatos = indicadores.en_curso > 0 || indicadores.entregados_30d > 0

  if (!hayDatos) {
    return (
      <div className="p-6 lg:p-8">
        <EstadoVacioDashboard />
      </div>
    )
  }

  const nombreCorto = perfil?.nombre?.split(' ')[0] ?? 'Administrador'

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6">

      {/* Saludo */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted capitalize">{fechaEspanol()}</span>
          <h1 className="font-display text-[28px] font-extrabold text-navy leading-tight">
            {saludoHora()}, {nombreCorto}
          </h1>
        </div>
      </div>

      {/* Envíos en curso por etapa */}
      <EnviosPorEtapa
        porEstado={por_estado}
        onFiltrar={estado => irAListado({ estado })}
      />

      {/* 4 indicadores KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TarjetaKpi
          titulo={t.dashboard.entregados30d}
          valor={indicadores.entregados_30d}
          color="text-[#047857]"
          detalle={
            indicadores.porcentaje_a_tiempo != null
              ? t.dashboard.porcentajeATiempo(indicadores.porcentaje_a_tiempo)
              : null
          }
          onClick={() => irAListado({ estado: 'entregado' })}
        />
        <TarjetaKpi
          titulo={t.dashboard.creadosHoy}
          valor={indicadores.creados_hoy}
          color="text-navy"
          detalle={
            indicadores.creados_hoy > 0
              ? t.dashboard.creadosHoyDesglose(
                  indicadores.creados_hoy_express,
                  indicadores.creados_hoy_estandar,
                )
              : null
          }
        />
        <TarjetaKpi
          titulo={t.dashboard.conNovedad}
          valor={indicadores.con_excepcion}
          color="text-[#B91C1C]"
          detalle={indicadores.con_excepcion > 0 ? 'Requieren gestión' : null}
          onClick={() => irAListado({ filtro: 'excepciones' })}
        />
        <TarjetaKpi
          titulo={t.dashboard.sinMovimiento5d}
          valor={indicadores.sin_movimiento_5d}
          color="text-[#9A3412]"
          detalle={indicadores.sin_movimiento_5d > 0 ? t.dashboard.revisarBodega : null}
        />
      </div>

      {/* Requieren atención + Últimos movimientos */}
      <div className="flex flex-wrap gap-4">
        <TablAtencion
          items={requieren_atencion}
          onVerTodos={() => irAListado({ filtro: 'excepciones' })}
          onVerItem={id => navigate(`/admin/envios/${id}`)}
        />
        <UltimosMovimientos
          movimientos={ultimos_movimientos}
          onVerItem={id => navigate(`/admin/envios/${id}`)}
          refresco={refrescoMov}
        />
      </div>

      {/* Gráfico 14 días */}
      {envios_14d && envios_14d.length > 0 && (
        <Grafico14d datos={envios_14d} />
      )}

    </div>
  )
}
