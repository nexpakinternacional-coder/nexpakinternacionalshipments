import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  Package,
  PackageCheck,
  PackagePlus,
  Plane,
  Shield,
  Zap,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatearGuia } from '../../lib/guia'
import { formatearFechaHora } from '../../lib/formato'
import { ESTADOS, FLUJO_NORMAL, ESTADOS_EXCEPCION, type EstadoEnvio } from '../../lib/estados'
import BadgeEstado from '../../components/BadgeEstado'
import { Skeleton } from '../../components/Skeleton'
import { t } from '../../textos/es'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Indicadores {
  en_curso: number
  transito_internacional: number
  en_aduana: number
  con_excepcion: number
  entregados_30d: number
  creados_hoy: number
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

interface ResumenDashboard {
  indicadores: Indicadores
  por_estado: Record<string, number>
  ultimos_movimientos: Movimiento[]
  requieren_atencion: Atencion[]
}

// ── Colores para las barras del gráfico ────────────────────────────────────────

const COLOR_BARRAS: Partial<Record<EstadoEnvio, string>> = {
  guia_generada: '#f1f5f9',
  recibido_origen: '#dbeafe',
  transito_internacional: '#e0e7ff',
  en_aduana: '#fef9c3',
  liberado_aduana: '#ccfbf1',
  centro_distribucion: '#f3e8ff',
  en_reparto: '#ffedd5',
  entregado: '#dcfce7',
  novedad: '#fee2e2',
  retenido_aduana: '#fee2e2',
  intento_fallido: '#fef3c7',
  devuelto: '#f1f5f9',
}

const COLOR_TEXTO_BARRAS: Partial<Record<EstadoEnvio, string>> = {
  guia_generada: '#475569',
  recibido_origen: '#1d4ed8',
  transito_internacional: '#4338ca',
  en_aduana: '#854d0e',
  liberado_aduana: '#0f766e',
  centro_distribucion: '#7e22ce',
  en_reparto: '#c2410c',
  entregado: '#15803d',
  novedad: '#dc2626',
  retenido_aduana: '#dc2626',
  intento_fallido: '#d97706',
  devuelto: '#475569',
}

// ── Tarjeta de indicador ─────────────────────────────────────────────────────

interface TarjetaIndicadorProps {
  titulo: string
  valor: number
  icono: React.ElementType
  color: string
  onClick?: () => void
}

function TarjetaIndicador({ titulo, valor, icono: Icono, color, onClick }: TarjetaIndicadorProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-surface border border-border rounded-xl p-5 text-left transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide leading-snug flex-1">
          {titulo}
        </span>
        <div className={`p-2 rounded-lg flex-shrink-0 ml-2 ${color}`}>
          <Icono size={16} strokeWidth={1.75} />
        </div>
      </div>
      <span className="text-3xl font-semibold text-ink">{valor}</span>
    </button>
  )
}

// ── Gráfico de barras horizontal (SVG) ────────────────────────────────────────

function GraficoBarras({ porEstado }: { porEstado: Record<string, number> }) {
  const estados = [...FLUJO_NORMAL, ...ESTADOS_EXCEPCION].filter(e => porEstado[e] != null && porEstado[e] > 0)
  if (estados.length === 0) return null

  const maxVal = Math.max(...estados.map(e => porEstado[e] ?? 0), 1)
  const barHeight = 28
  const gap = 6
  const labelW = 150
  const svgWidth = '100%'
  const totalHeight = estados.length * (barHeight + gap)

  return (
    <svg
      width={svgWidth}
      height={totalHeight}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Distribución por estado"
    >
      {estados.map((estado, i) => {
        const y = i * (barHeight + gap)
        const count = porEstado[estado] ?? 0
        const bg = COLOR_BARRAS[estado as EstadoEnvio] ?? '#e2e8f0'
        const textColor = COLOR_TEXTO_BARRAS[estado as EstadoEnvio] ?? '#374151'
        const etiqueta = ESTADOS[estado as EstadoEnvio]?.etiqueta ?? estado

        return (
          <g key={estado} transform={`translate(0,${y})`}>
            {/* Etiqueta */}
            <text
              x={labelW - 8}
              y={barHeight / 2 + 4}
              textAnchor="end"
              fontSize={12}
              fill="#6b7280"
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {etiqueta}
            </text>
            {/* Barra — usamos foreignObject para hacer la barra responsive */}
            <rect
              x={labelW}
              y={2}
              width={`${(count / maxVal) * 60}%`}
              height={barHeight - 4}
              rx={4}
              fill={bg}
            />
            {/* Conteo */}
            <text
              x={labelW + 6}
              y={barHeight / 2 + 4}
              fontSize={11}
              fontWeight={600}
              fill={textColor}
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: err } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>)(
        'resumen_dashboard',
      )
      if (err) {
        setError(t.dashboard.errorResumen)
        setCargando(false)
        return
      }
      setResumen(data as ResumenDashboard)
      setCargando(false)
    }
    cargar()
  }, [])

  function irAListado(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params)
    navigate(`/admin/envios?${q.toString()}`)
  }

  if (cargando) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-7 w-32 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
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

  const { indicadores, por_estado, ultimos_movimientos, requieren_atencion } = resumen

  const tarjetas: TarjetaIndicadorProps[] = [
    {
      titulo: t.dashboard.enCurso,
      valor: indicadores.en_curso,
      icono: Package,
      color: 'bg-blue-100 text-blue-700',
      onClick: () => irAListado({ actividad: 'activos' }),
    },
    {
      titulo: t.dashboard.transitoInternacional,
      valor: indicadores.transito_internacional,
      icono: Plane,
      color: 'bg-indigo-100 text-indigo-700',
      onClick: () => irAListado({ estado: 'transito_internacional' }),
    },
    {
      titulo: t.dashboard.enAduana,
      valor: indicadores.en_aduana,
      icono: Shield,
      color: 'bg-yellow-100 text-yellow-700',
      onClick: () => irAListado({ estado: 'en_aduana' }),
    },
    {
      titulo: t.dashboard.conNovedad,
      valor: indicadores.con_excepcion,
      icono: AlertTriangle,
      color: 'bg-red-100 text-red-700',
      onClick: () => irAListado({ filtro: 'excepciones' }),
    },
    {
      titulo: t.dashboard.entregados30d,
      valor: indicadores.entregados_30d,
      icono: PackageCheck,
      color: 'bg-green-100 text-green-700',
      onClick: () => irAListado({ estado: 'entregado' }),
    },
    {
      titulo: t.dashboard.creadosHoy,
      valor: indicadores.creados_hoy,
      icono: PackagePlus,
      color: 'bg-purple-100 text-purple-700',
      onClick: () => irAListado({ actividad: 'activos' }),
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-ink mb-6">{t.dashboard.titulo}</h1>

      {/* Tarjetas de indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {tarjetas.map(card => (
          <TarjetaIndicador key={card.titulo} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Gráfico de barras */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-xs font-semibold text-navy uppercase tracking-wide mb-5">
            {t.dashboard.distribucionEstados}
          </h2>
          {Object.keys(por_estado).length > 0 ? (
            <GraficoBarras porEstado={por_estado} />
          ) : (
            <p className="text-sm text-ink-muted">{t.dashboard.sinDatos}</p>
          )}
        </div>

        {/* Requieren atención */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-xs font-semibold text-navy uppercase tracking-wide mb-4">
            {t.dashboard.requierenAtencion}
          </h2>
          {requieren_atencion.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <PackageCheck size={28} strokeWidth={1.5} className="text-green-400 mb-2" />
              <p className="text-sm text-ink-muted">{t.dashboard.sinAtencion}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requieren_atencion.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/admin/envios/${item.id}`)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:border-navy/30 hover:bg-canvas transition-colors cursor-pointer text-left"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.motivo === 'excepcion' ? (
                      <AlertTriangle size={14} className="text-red-500" strokeWidth={2} />
                    ) : (
                      <Clock size={14} className="text-amber-500" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-mono text-xs font-semibold text-navy">
                        {formatearGuia(item.guia)}
                      </span>
                      <BadgeEstado estado={item.estado_actual as EstadoEnvio} size="sm" />
                    </div>
                    <p className="text-xs text-ink-muted truncate">{item.destinatario_nombre}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {item.motivo === 'excepcion'
                        ? t.dashboard.motivoExcepcion
                        : t.dashboard.motivoEstancado(item.dias_sin_movimiento)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-navy uppercase tracking-wide">
            {t.dashboard.ultimosMovimientos}
          </h2>
          <button
            onClick={() => irAListado()}
            className="text-xs text-accent-strong hover:underline cursor-pointer"
          >
            {t.dashboard.verListado}
          </button>
        </div>
        {ultimos_movimientos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Zap size={24} strokeWidth={1.5} className="text-ink-muted/50 mb-2" />
            <p className="text-sm text-ink-muted">{t.dashboard.sinMovimientos}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {ultimos_movimientos.map((mov, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                      ESTADOS[mov.estado as EstadoEnvio]?.colorFondo ?? 'bg-border'
                    }`}
                  />
                  {idx < ultimos_movimientos.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>
                <div
                  className={`min-w-0 flex-1 ${idx < ultimos_movimientos.length - 1 ? 'pb-4' : ''} cursor-pointer`}
                  onClick={() => navigate(`/admin/envios/${mov.envio_id}`)}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <button className="font-mono text-xs font-semibold text-navy hover:underline cursor-pointer">
                      {formatearGuia(mov.guia)}
                    </button>
                    <BadgeEstado estado={mov.estado as EstadoEnvio} size="sm" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {mov.ubicacion && (
                      <span className="text-xs text-ink">{mov.ubicacion}</span>
                    )}
                    <span className="text-xs text-ink-muted">
                      {formatearFechaHora(mov.ocurrido_en)}
                    </span>
                    <span className="text-xs text-ink-muted">· {mov.creado_por}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
