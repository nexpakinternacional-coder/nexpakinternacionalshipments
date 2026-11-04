import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Copy,
  Share2,
  WifiOff,
} from 'lucide-react'
import { formatearGuia, normalizarGuia, validarGuia } from '../../lib/guia'
import { formatearFechaHora, formatearSoloFecha } from '../../lib/formato'
import {
  ESTADOS,
  ESTADOS_EXCEPCION,
  FLUJO_NORMAL,
  type EstadoEnvio,
} from '../../lib/estados'
import { t } from '../../textos/es'
import { useRastreo, type DatoRastreo } from './useRastreo'

// ── Helpers ─────────────────────────────────────────────────────────────────

function tiempoRelativo(fecha: Date): string {
  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000)
  if (segundos < 90) return 'hace menos de 1 min'
  const minutos = Math.floor(segundos / 60)
  if (minutos === 1) return 'hace 1 min'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`
}

// ── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonBloque({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-border/60 rounded-lg animate-pulse ${className}`} />
  )
}

function SkeletonRastreo() {
  return (
    <div className="space-y-4 py-6">
      <SkeletonBloque className="h-8 w-48" />
      <SkeletonBloque className="h-24 w-full rounded-xl" />
      <SkeletonBloque className="h-12 w-full rounded-xl" />
      <SkeletonBloque className="h-32 w-full rounded-xl" />
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map(i => (
          <SkeletonBloque key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ── Barra de progreso ────────────────────────────────────────────────────────

function BarraProgreso({ estado }: { estado: EstadoEnvio }) {
  const esExcepcion = ESTADOS_EXCEPCION.includes(estado)
  const idxActual = esExcepcion ? -1 : FLUJO_NORMAL.indexOf(estado)
  // Si excepción, mostrar hasta el último paso del flujo normal (como "detenido")
  const idxMostrar = esExcepcion ? FLUJO_NORMAL.length - 1 : idxActual

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
        {t.rastreo.estadoActual}
      </p>

      {/* Mobile: barra de progreso lineal */}
      <div className="sm:hidden">
        <div className="flex justify-between text-xs text-ink-muted mb-2">
          <span>
            Paso {esExcepcion ? '?' : idxActual + 1} de {FLUJO_NORMAL.length}
          </span>
          <span>{ESTADOS[estado].etiqueta}</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              esExcepcion ? 'bg-red-400' : 'bg-navy'
            }`}
            style={{
              width: esExcepcion
                ? '100%'
                : `${((idxActual + 1) / FLUJO_NORMAL.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop: pasos con círculos */}
      <div className="hidden sm:flex items-center overflow-x-auto pb-1" style={{ gap: 0 }}>
        {FLUJO_NORMAL.map((e, i) => {
          const completado = idxActual > i || (idxActual === -1 && idxMostrar > i)
          const actual = idxActual === i
          const esExcepActual = esExcepcion && i === idxMostrar

          return (
            <div key={e} className="flex items-center flex-1 min-w-0">
              {/* Línea izquierda */}
              {i > 0 && (
                <div
                  className={`flex-1 h-0.5 ${completado || esExcepActual ? 'bg-navy' : 'bg-border'}`}
                />
              )}
              {/* Círculo */}
              <div
                title={ESTADOS[e].etiqueta}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                  esExcepActual
                    ? 'border-red-400 bg-red-50'
                    : actual
                    ? 'border-navy bg-navy'
                    : completado
                    ? 'border-navy bg-navy'
                    : 'border-border bg-surface'
                }`}
              >
                {(completado || actual) && !esExcepActual && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
                {esExcepActual && (
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                )}
              </div>
              {/* Línea derecha (solo si no es último) */}
              {i < FLUJO_NORMAL.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${completado ? 'bg-navy' : 'bg-border'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: inicio · paso actual · fin */}
      <div className="hidden sm:flex justify-between items-baseline mt-2.5">
        <span className="text-[10px] text-ink-muted">{ESTADOS[FLUJO_NORMAL[0]].etiqueta}</span>
        <span className="text-xs font-semibold text-navy">
          {ESTADOS[estado].etiqueta}
          {!esExcepcion && (
            <span className="font-normal text-ink-muted">
              {' · '}Paso {idxActual + 1} de {FLUJO_NORMAL.length}
            </span>
          )}
        </span>
        <span className="text-[10px] text-ink-muted">{ESTADOS[FLUJO_NORMAL[FLUJO_NORMAL.length - 1]].etiqueta}</span>
      </div>
    </div>
  )
}

// ── Estado grande ────────────────────────────────────────────────────────────

function TarjetaEstado({
  datos,
  enVivo,
  ultimaActualizacion,
  animando,
}: {
  datos: DatoRastreo
  enVivo: boolean
  ultimaActualizacion: Date | null
  animando: boolean
}) {
  const info = ESTADOS[datos.estado_actual]
  const ultimoEvento = datos.eventos[datos.eventos.length - 1]

  return (
    <div
      className={`bg-surface border border-border rounded-xl p-5 mb-4 transition-all duration-300 ${
        animando ? 'ring-2 ring-accent/40 scale-[1.005]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${info.colorFondo} ${info.colorTexto} mb-3`}>
            <span>{info.etiqueta}</span>
          </div>
          {ultimoEvento?.ubicacion && (
            <p className="text-sm text-ink-muted mb-1">{ultimoEvento.ubicacion}</p>
          )}
          {ultimoEvento && (
            <p className="text-xs text-ink-muted">
              {formatearFechaHora(ultimoEvento.ocurrido_en)}
            </p>
          )}
        </div>
        {/* Indicador en vivo */}
        <div className="flex-shrink-0 text-right">
          {enVivo ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {t.rastreo.enVivo}
            </span>
          ) : ultimaActualizacion ? (
            <span className="text-xs text-ink-muted">
              {t.rastreo.actualizadoHace(tiempoRelativo(ultimaActualizacion))}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Banner excepción ──────────────────────────────────────────────────────────

function BannerExcepcion() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex gap-3">
      <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <div>
        <p className="text-sm font-semibold text-amber-800 mb-0.5">
          {t.rastreo.bannerExcepcionTitulo}
        </p>
        <p className="text-sm text-amber-700">{t.rastreo.bannerExcepcionTexto}</p>
        <a
          href={`mailto:${t.pie.correo}`}
          className="inline-block mt-2 text-xs font-semibold text-amber-800 underline hover:no-underline"
        >
          {t.rastreo.contactarNexpak}
        </a>
      </div>
    </div>
  )
}

// ── Info ruta ────────────────────────────────────────────────────────────────

function InfoRuta({ datos }: { datos: DatoRastreo }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
      <div>
        <p className="text-xs text-ink-muted mb-0.5">{t.rastreo.origen}</p>
        <p className="font-medium text-ink text-sm">{datos.origen_ciudad}</p>
        <p className="text-xs text-ink-muted">{datos.origen_pais}</p>
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-0.5">{t.rastreo.destino}</p>
        <p className="font-medium text-ink text-sm">{datos.destino_ciudad}</p>
        <p className="text-xs text-ink-muted">{datos.destino_pais}</p>
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-0.5">{t.rastreo.destinatario}</p>
        <p className="font-medium text-ink text-sm">{datos.destinatario}</p>
        <p className="text-xs text-ink-muted">
          {datos.tipo_servicio === 'express'
            ? t.rastreo.servicioExpress
            : t.rastreo.servicioEstandar}
        </p>
      </div>
      {datos.fecha_estimada_entrega && (
        <div>
          <p className="text-xs text-ink-muted mb-0.5">{t.rastreo.fechaEstimada}</p>
          <p className="font-medium text-ink text-sm">
            {formatearSoloFecha(datos.fecha_estimada_entrega)}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Historial ────────────────────────────────────────────────────────────────

function Historial({ eventos }: { eventos: DatoRastreo['eventos'] }) {
  if (eventos.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-5">
        {t.rastreo.historial}
      </h2>
      <div>
        {[...eventos].reverse().map((ev, idx) => {
          const info = ESTADOS[ev.estado]
          return (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-surface ${info.colorFondo}`}
                />
                {idx < eventos.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" />
                )}
              </div>
              <div className={`min-w-0 flex-1 ${idx < eventos.length - 1 ? 'pb-5' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5 gap-1 ${info.colorFondo} ${info.colorTexto}`}
                  >
                    {info.etiqueta}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {formatearFechaHora(ev.ocurrido_en)}
                  </span>
                </div>
                {ev.ubicacion && (
                  <p className="text-sm text-ink mt-0.5">{ev.ubicacion}</p>
                )}
                {ev.nota_publica && (
                  <p className="text-sm text-ink-muted mt-0.5">{ev.nota_publica}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Cabecera con guía y botones ──────────────────────────────────────────────

function GuiaHeader({ guia }: { guia: string }) {
  const [copiado, setCopiado] = useState(false)
  const [enlaceCopiado, setEnlaceCopiado] = useState(false)

  async function copiarGuia() {
    await navigator.clipboard.writeText(formatearGuia(guia))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function compartir() {
    const url = `${window.location.origin}/rastreo/${guia}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Guía ${formatearGuia(guia)} · Nexpak`,
          url,
        })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(url)
    setEnlaceCopiado(true)
    setTimeout(() => setEnlaceCopiado(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <span className="font-mono text-xl font-semibold text-navy tracking-widest whitespace-nowrap">
        {formatearGuia(guia)}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={copiarGuia}
          aria-label={t.rastreo.copiarGuia}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-border rounded-lg text-xs text-ink hover:bg-canvas transition-colors cursor-pointer"
        >
          {copiado ? (
            <CheckCircle size={13} className="text-green-500" />
          ) : (
            <Copy size={13} />
          )}
          <span className="hidden sm:inline">{copiado ? t.rastreo.guiaCopiada : t.rastreo.copiarGuia}</span>
        </button>
        <button
          onClick={compartir}
          aria-label={t.rastreo.compartir}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border border-border rounded-lg text-xs text-ink hover:bg-canvas transition-colors cursor-pointer"
        >
          <Share2 size={13} />
          <span className="hidden sm:inline">{enlaceCopiado ? t.rastreo.enlaceCopiado : t.rastreo.compartir}</span>
        </button>
      </div>
    </div>
  )
}

// ── Estado no encontrado ─────────────────────────────────────────────────────

function NoEncontrado() {
  const navigate = useNavigate()
  const [inputGuia, setInputGuia] = useState('')

  function formatarInput(raw: string) {
    const limpio = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    if (limpio.length <= 3) return limpio
    return `${limpio.slice(0, 3)}-${limpio.slice(3)}`
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    const norm = normalizarGuia(inputGuia)
    if (validarGuia(norm)) navigate(`/rastreo/${norm}`)
  }

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-border/50 mb-5">
        <WifiOff size={28} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h1 className="text-xl font-semibold text-ink mb-2">{t.rastreo.noEncontrado}</h1>
      <p className="text-sm text-ink-muted mb-8">{t.rastreo.noEncontradoDetalle}</p>
      <form onSubmit={handleBuscar} className="max-w-xs mx-auto flex gap-2">
        <input
          type="text"
          value={inputGuia}
          onChange={e => setInputGuia(formatarInput(e.target.value))}
          placeholder={t.rastreo.placeholder}
          className="flex-1 font-mono text-sm text-center px-3 py-2.5 border border-border rounded-lg bg-surface focus:outline-none focus:border-navy"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-accent-strong text-white text-sm font-semibold rounded-lg hover:bg-accent cursor-pointer transition-colors"
        >
          {t.rastreo.botonRastrear}
        </button>
      </form>
      <Link to="/" className="inline-block mt-4 text-sm text-ink-muted hover:text-ink underline">
        {t.rastreo.volverBuscar}
      </Link>
    </div>
  )
}

// ── Error de conexión ─────────────────────────────────────────────────────────

function ErrorConexion({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-border/50 mb-5">
        <WifiOff size={28} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <p className="text-ink-muted mb-4 text-sm">{t.rastreo.errorConexion}</p>
      <button
        onClick={onReintentar}
        className="px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 cursor-pointer transition-colors"
      >
        {t.rastreo.reintentar}
      </button>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function RastreoPage() {
  const { guia: guiaParam = '' } = useParams<{ guia: string }>()
  const { datos, estadoHook, ultimaActualizacion, enVivo, animando, buscar } =
    useRastreo(guiaParam)

  // SEO dinámico
  useEffect(() => {
    if (datos) {
      const guiaFmt = formatearGuia(datos.guia)
      document.title = t.rastreo.seoTituloResultado(guiaFmt)
      document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        t.rastreo.seoDescResultado(guiaFmt),
      )
      // Open Graph
      setOgTag('og:title', `Guía ${guiaFmt} · Nexpak`)
      setOgTag('og:description', t.rastreo.seoDescResultado(guiaFmt))
      setOgTag('og:url', window.location.href)
    } else {
      document.title = t.rastreo.seoTituloInicio
    }
  }, [datos])

  // noindex en páginas de rastreo
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex'
    return () => meta?.remove()
  }, [])

  return (
    <>
      {/* Cabecera de navegación */}
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
            aria-label="Volver al inicio"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">{t.rastreo.volverBuscar}</span>
          </Link>
          <span className="text-base font-semibold text-navy">{t.app.nombre}</span>
          <div className="w-24" /> {/* balance */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {estadoHook === 'cargando' && <SkeletonRastreo />}

        {estadoHook === 'no_encontrado' && <NoEncontrado />}

        {estadoHook === 'error' && <ErrorConexion onReintentar={buscar} />}

        {estadoHook === 'encontrado' && datos && (
          <>
            <GuiaHeader guia={datos.guia} />
            <TarjetaEstado
              datos={datos}
              enVivo={enVivo}
              ultimaActualizacion={ultimaActualizacion}
              animando={animando}
            />
            <BarraProgreso estado={datos.estado_actual} />
            {ESTADOS_EXCEPCION.includes(datos.estado_actual) && <BannerExcepcion />}
            <InfoRuta datos={datos} />
            <Historial eventos={datos.eventos} />
          </>
        )}
      </main>

      {/* Pie */}
      <footer className="border-t border-border py-5 px-4 mt-6">
        <div className="max-w-2xl mx-auto text-center text-xs text-ink-muted">
          <span className="font-semibold text-navy">{t.app.nombre}</span>
          {' · '}
          {t.pie.telefono}
          {' · '}
          {t.pie.correo}
        </div>
      </footer>
    </>
  )
}

function setOgTag(property: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.appendChild(meta)
  }
  meta.content = content
}
