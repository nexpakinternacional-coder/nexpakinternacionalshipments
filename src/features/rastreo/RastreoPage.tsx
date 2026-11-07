import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  Copy,
  CheckCircle,
  MessageCircle,
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
import MapaEnvio, { type DatosMapa } from '../../components/MapaEnvio'
import Logo from '../../components/Logo'
import { useConfiguracionSitio, urlWhatsAppConfig } from '../../hooks/useConfiguracionSitio'

// ── Helpers ──────────────────────────────────────────────────────────────────

function datosMapa(d: DatoRastreo): DatosMapa {
  return {
    origen: d.origen_lat != null && d.origen_lng != null
      ? { lat: d.origen_lat, lng: d.origen_lng, etiqueta: d.origen_ciudad }
      : undefined,
    destino: d.destino_lat != null && d.destino_lng != null
      ? { lat: d.destino_lat, lng: d.destino_lng, etiqueta: d.destino_ciudad }
      : undefined,
    eventos: d.eventos
      .filter(ev => ev.lat != null && ev.lng != null)
      .map(ev => ({
        lat: ev.lat!,
        lng: ev.lng!,
        etiqueta: ev.ubicacion_etiqueta ?? ev.ubicacion ?? undefined,
      })),
  }
}

function siguienteEtiqueta(estado: EstadoEnvio): string | null {
  const idx = FLUJO_NORMAL.indexOf(estado)
  if (idx === -1 || idx >= FLUJO_NORMAL.length - 1) return null
  return ESTADOS[FLUJO_NORMAL[idx + 1]].etiqueta
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/15 rounded-lg animate-pulse ${className}`} />
}

function SkeletonSuperior() {
  return (
    <div className="bg-navy text-white px-5 py-6 flex flex-col gap-5">
      <Skeleton className="h-6 w-36" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-6 w-full rounded-full" />
    </div>
  )
}

function SkeletonCuerpo() {
  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden h-[300px] animate-pulse" />
      <div className="bg-surface border border-border-subtle rounded-2xl p-[18px] h-[70px] animate-pulse" />
      <div className="bg-surface border border-border-subtle rounded-2xl p-5 flex flex-col gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="w-3.5 h-3.5 mt-1 rounded-full bg-border-subtle flex-shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <div className="h-4 bg-border-subtle rounded w-32 animate-pulse" />
              <div className="h-3 bg-border-subtle rounded w-24 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Superior: guía + progreso ─────────────────────────────────────────────────

function SeccionSuperior({
  datos,
  enVivo,
  animando,
}: {
  datos: DatoRastreo
  enVivo: boolean
  animando: boolean
}) {
  const [copiado, setCopiado] = useState(false)
  const [enlaceCopiado, setEnlaceCopiado] = useState(false)

  const esExcepcion = ESTADOS_EXCEPCION.includes(datos.estado_actual)
  const idxActual = esExcepcion ? -1 : FLUJO_NORMAL.indexOf(datos.estado_actual)
  const ultimoEvento = datos.eventos[datos.eventos.length - 1]
  const infoEstado = ESTADOS[datos.estado_actual]
  const siguiente = siguienteEtiqueta(datos.estado_actual)

  async function copiarGuia() {
    await navigator.clipboard.writeText(formatearGuia(datos.guia))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function compartir() {
    const url = `${window.location.origin}/rastreo/${datos.guia}`
    if (navigator.share) {
      try { await navigator.share({ title: `Guía ${formatearGuia(datos.guia)} · Nexpak`, url }); return } catch {}
    }
    await navigator.clipboard.writeText(url)
    setEnlaceCopiado(true)
    setTimeout(() => setEnlaceCopiado(false), 2000)
  }

  return (
    <section
      className={`bg-navy text-white px-5 pb-6 pt-4 flex flex-col gap-[18px] transition-all duration-300 ${
        animando ? 'ring-2 ring-accent/40' : ''
      }`}
    >
      {/* Guía + botones */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xl font-semibold tracking-[0.04em] whitespace-nowrap">
          {formatearGuia(datos.guia)}
        </span>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={copiarGuia}
            aria-label={copiado ? t.rastreo.guiaCopiada : t.rastreo.copiarGuia}
            className="w-11 h-11 rounded-[10px] border border-white/22 bg-transparent text-white flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
          >
            {copiado
              ? <CheckCircle size={18} strokeWidth={1.8} aria-hidden="true" />
              : <Copy size={18} strokeWidth={1.8} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={compartir}
            aria-label={enlaceCopiado ? t.rastreo.enlaceCopiado : t.rastreo.compartir}
            className="w-11 h-11 rounded-[10px] border border-white/22 bg-transparent text-white flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
          >
            {enlaceCopiado
              ? <CheckCircle size={18} strokeWidth={1.8} aria-hidden="true" />
              : <Share2 size={18} strokeWidth={1.8} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Estado */}
      <div className="flex flex-col gap-1.5">
        {enVivo && (
          <span className="inline-flex self-start items-center gap-1.5 text-xs font-semibold text-[#A7F3D0] uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            En vivo
          </span>
        )}
        <h1
          className="m-0 font-display font-extrabold leading-[1.05] text-white"
          style={{ fontSize: 'clamp(28px, 8vw, 40px)' }}
        >
          {infoEstado.etiqueta}
        </h1>
        {ultimoEvento?.ubicacion && (
          <span className="text-[15px] text-[#C9D3E3]">
            {ultimoEvento.ubicacion}
            {ultimoEvento.ocurrido_en && (
              <> · {formatearFechaHora(ultimoEvento.ocurrido_en)}</>
            )}
          </span>
        )}
      </div>

      {/* Barra de progreso segmentada */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          {FLUJO_NORMAL.map((_, i) => {
            const completado = !esExcepcion && i < idxActual
            const actual = !esExcepcion && i === idxActual
            return (
              <span
                key={i}
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: completado
                    ? '#FFFFFF'
                    : actual
                    ? '#E8500A'
                    : 'rgba(255,255,255,0.18)',
                }}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-[13px] text-[#C9D3E3]">
          <span>
            {esExcepcion
              ? infoEstado.etiqueta
              : `Paso ${idxActual + 1} de ${FLUJO_NORMAL.length}`}
          </span>
          {siguiente && !esExcepcion && <span>Siguiente: {siguiente}</span>}
        </div>
      </div>
    </section>
  )
}

// ── Banner excepción ──────────────────────────────────────────────────────────

function BannerExcepcion({ correo }: { correo: string }) {
  return (
    <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
      <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <div>
        <p className="text-sm font-semibold text-amber-800 mb-0.5">
          {t.rastreo.bannerExcepcionTitulo}
        </p>
        <p className="text-sm text-amber-700">{t.rastreo.bannerExcepcionTexto}</p>
        {correo && (
          <a
            href={`mailto:${correo}`}
            className="inline-block mt-2 text-xs font-semibold text-amber-800 underline hover:no-underline"
          >
            {t.rastreo.contactarNexpak}
          </a>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta info ──────────────────────────────────────────────────────────────

function TarjetaInfo({ datos }: { datos: DatoRastreo }) {
  return (
    <div className="mx-4 mt-4 bg-surface border border-border-subtle rounded-2xl p-[18px] grid grid-cols-3 gap-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-ink-muted">Para</span>
        <strong className="text-sm font-semibold truncate">{datos.destinatario}</strong>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-ink-muted">Servicio</span>
        <strong className="text-sm font-semibold">
          {datos.tipo_servicio === 'express' ? t.rastreo.servicioExpress : t.rastreo.servicioEstandar}
        </strong>
      </div>
      {datos.fecha_estimada_entrega && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-ink-muted">Entrega est.</span>
          <strong className="text-sm font-semibold">{formatearSoloFecha(datos.fecha_estimada_entrega)}</strong>
        </div>
      )}
    </div>
  )
}

// ── Historial ─────────────────────────────────────────────────────────────────

function Historial({ eventos }: { eventos: DatoRastreo['eventos'] }) {
  if (eventos.length === 0) return null
  const invertidos = [...eventos].reverse()
  const idxActual = 0 // el primer elemento tras invertir es el más reciente

  return (
    <div className="mx-4 mt-4 bg-surface border border-border-subtle rounded-2xl p-5">
      <h2 className="m-0 mb-3 text-[13px] font-semibold tracking-[0.1em] uppercase text-ink-muted">
        {t.rastreo.historial}
      </h2>
      <div>
        {invertidos.map((ev, idx) => {
          const esActual = idx === idxActual
          const info = ESTADOS[ev.estado]
          return (
            <div key={idx} className="flex gap-3.5">
              {/* Línea de tiempo */}
              <div className="flex flex-col items-center flex-shrink-0">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{
                    background: esActual ? '#E8500A' : '#0F2D5E',
                    boxShadow: esActual ? '0 0 0 4px #FDEEE6' : undefined,
                  }}
                />
                {idx < invertidos.length - 1 && (
                  <span className="flex-1 w-0.5 bg-[#E3E8F0] my-1" />
                )}
              </div>
              {/* Contenido */}
              <div className={`min-w-0 flex-1 flex flex-col gap-1 ${idx < invertidos.length - 1 ? 'pb-5' : ''}`}>
                <strong
                  className="text-base font-semibold"
                  style={{ color: esActual ? '#0F2D5E' : '#111827' }}
                >
                  {info.etiqueta}
                </strong>
                <span className="text-[13px] text-ink-muted">
                  {ev.ubicacion && <>{ev.ubicacion} · </>}
                  {formatearFechaHora(ev.ocurrido_en)}
                </span>
                {ev.nota_publica && (
                  <span className="text-sm text-[#374151] leading-relaxed mt-0.5">{ev.nota_publica}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Estado no encontrado ──────────────────────────────────────────────────────

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
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-icon-bg flex items-center justify-center mb-5">
        <WifiOff size={28} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <h1 className="text-xl font-semibold text-ink mb-2">{t.rastreo.noEncontrado}</h1>
      <p className="text-sm text-ink-muted mb-8 max-w-xs">{t.rastreo.noEncontradoDetalle}</p>
      <form onSubmit={handleBuscar} className="w-full max-w-xs flex gap-2">
        <input
          type="text"
          value={inputGuia}
          onChange={e => setInputGuia(formatarInput(e.target.value))}
          placeholder={t.rastreo.placeholder}
          className="flex-1 font-mono text-sm text-center px-3 py-3 border border-border rounded-xl bg-surface focus:outline-none focus:border-navy"
        />
        <button
          type="submit"
          className="px-4 py-3 bg-accent-strong text-white text-sm font-semibold rounded-xl hover:bg-accent cursor-pointer transition-colors"
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
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-icon-bg flex items-center justify-center mb-5">
        <WifiOff size={28} strokeWidth={1.5} className="text-ink-muted" />
      </div>
      <p className="text-ink-muted mb-6 text-sm">{t.rastreo.errorConexion}</p>
      <button
        onClick={onReintentar}
        className="px-5 py-3 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 cursor-pointer transition-colors"
      >
        {t.rastreo.reintentar}
      </button>
    </div>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────

function LayoutRastreo({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Cabecera */}
      <header className="bg-navy px-5 h-[60px] flex items-center justify-between flex-shrink-0">
        <Link
          to="/"
          aria-label="Nexpak, inicio"
          className="flex-shrink-0"
        >
          <Logo variante="horizontal" tono="blanco" alto={26} alt="" />
        </Link>
        <Link
          to="/"
          className="min-h-[44px] flex items-center text-sm text-[#DCE3EE] hover:text-white transition-colors"
        >
          Otra guía
        </Link>
      </header>
      {/* Contenido */}
      <main className="flex-1 max-w-[560px] w-full mx-auto pb-8">
        {children}
      </main>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RastreoPage() {
  const { guia: guiaParam = '' } = useParams<{ guia: string }>()
  const { datos, estadoHook, enVivo, animando, buscar } = useRastreo(guiaParam)
  const { config } = useConfiguracionSitio()

  // SEO dinámico
  useEffect(() => {
    if (datos) {
      const guiaFmt = formatearGuia(datos.guia)
      document.title = t.rastreo.seoTituloResultado(guiaFmt)
      document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        t.rastreo.seoDescResultado(guiaFmt),
      )
      setOgTag('og:title', `Guía ${guiaFmt} · Nexpak`)
      setOgTag('og:description', t.rastreo.seoDescResultado(guiaFmt))
      setOgTag('og:url', window.location.href)
    } else {
      document.title = t.rastreo.seoTituloInicio
    }
  }, [datos])

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

  if (estadoHook === 'cargando') {
    return (
      <LayoutRastreo>
        <SkeletonSuperior />
        <SkeletonCuerpo />
      </LayoutRastreo>
    )
  }

  if (estadoHook === 'no_encontrado') {
    return (
      <LayoutRastreo>
        <NoEncontrado />
      </LayoutRastreo>
    )
  }

  if (estadoHook === 'error') {
    return (
      <LayoutRastreo>
        <ErrorConexion onReintentar={buscar} />
      </LayoutRastreo>
    )
  }

  if (estadoHook !== 'encontrado' || !datos) return null

  const esExcepcion = ESTADOS_EXCEPCION.includes(datos.estado_actual)

  return (
    <LayoutRastreo>
      {/* Bloque superior navy */}
      <SeccionSuperior datos={datos} enVivo={enVivo} animando={animando} />

      {/* Banner excepción justo debajo del bloque superior */}
      {esExcepcion && <BannerExcepcion correo={config.correo} />}

      {/* Mapa */}
      <MapaEnvio datos={datosMapa(datos)} className="mx-4 mt-4" />

      {/* Info destinatario/servicio/entrega */}
      <TarjetaInfo datos={datos} />

      {/* Historial */}
      <Historial eventos={datos.eventos} />

      {/* Botón WhatsApp — solo si hay número configurado */}
      {config.whatsapp && (
        <a
          href={urlWhatsAppConfig(config, `Hola, tengo una pregunta sobre mi envío con guía ${formatearGuia(datos.guia)}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 mt-4 min-h-[52px] flex items-center justify-center gap-2.5 rounded-xl bg-accent-strong text-white font-semibold text-base hover:bg-accent transition-colors cursor-pointer no-underline"
        >
          <MessageCircle size={18} strokeWidth={1.8} aria-hidden="true" />
          ¿Dudas con tu envío? Escríbenos
        </a>
      )}
    </LayoutRastreo>
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
