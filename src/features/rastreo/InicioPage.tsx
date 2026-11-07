import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Globe,
  MessageCircle,
  Search,
  FileText,
  Menu,
  X,
} from 'lucide-react'
import { normalizarGuia, validarGuia } from '../../lib/guia'
import { t } from '../../textos/es'
import Logo from '../../components/Logo'
import {
  useConfiguracionSitio,
  formatearRangoDias,
  urlWhatsAppConfig,
} from '../../hooks/useConfiguracionSitio'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatarInputGuia(raw: string): string {
  const limpio = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
  if (limpio.length <= 3) return limpio
  return `${limpio.slice(0, 3)}-${limpio.slice(3)}`
}

// ── Encabezado ────────────────────────────────────────────────────────────────

function Encabezado({ urlWa }: { urlWa: string | null }) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  const enlaces = [
    { href: '#rastrear', label: 'Rastrear' },
    { href: '#servicios', label: 'Servicios' },
    { href: '#rutas', label: 'Rutas' },
    { href: '#como', label: 'Cómo funciona' },
    { href: '#contacto', label: 'Contacto' },
  ]

  return (
    <header className="bg-navy border-b border-white/8 sticky top-0 z-40">
      <div className="max-w-[1240px] mx-auto px-6 flex items-center justify-between gap-4" style={{ minHeight: '72px' }}>
        {/* Logo */}
        <a href="#inicio" aria-label="Nexpak, inicio" className="flex-shrink-0">
          <Logo variante="horizontal" tono="blanco" alto={32} alt="" />
        </a>

        {/* Nav desktop */}
        <nav aria-label="Principal" className="hidden md:flex items-center gap-7">
          {enlaces.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-[#DCE3EE] hover:text-white text-sm transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Botón Escríbenos — solo si hay WhatsApp */}
        {urlWa && (
          <a
            href={urlWa}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 min-h-[44px] px-[18px] rounded-[10px] bg-white text-navy font-semibold text-sm hover:bg-canvas transition-colors flex-shrink-0 cursor-pointer"
          >
            <MessageCircle size={17} strokeWidth={1.8} aria-hidden="true" />
            Escríbenos
          </a>
        )}

        {/* Hamburger móvil */}
        <button
          type="button"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto(v => !v)}
          className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Menú móvil desplegado */}
      {menuAbierto && (
        <div className="md:hidden bg-navy border-t border-white/8">
          <nav className="max-w-[1240px] mx-auto px-6 py-4 flex flex-col gap-1">
            {enlaces.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuAbierto(false)}
                className="text-[#DCE3EE] hover:text-white text-base py-2.5 transition-colors"
              >
                {label}
              </a>
            ))}
            {urlWa && (
              <a
                href={urlWa}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuAbierto(false)}
                className="inline-flex items-center gap-2 mt-3 min-h-[44px] px-5 rounded-[10px] bg-white text-navy font-semibold text-sm self-start cursor-pointer"
              >
                <MessageCircle size={17} strokeWidth={1.8} aria-hidden="true" />
                Escríbenos
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

// ── Ilustración hero ─────────────────────────────────────────────────────────

const RUTA_PATH = 'M 50 185 C 100 185, 340 20, 390 55'
// Punto central de la ruta (t=0.5): (220, 107) — calculado analíticamente

function IsotipoMini() {
  return (
    // Isotipo a escala 0.55 (44×37px), con centro en (0,0) del padre
    <g transform="translate(-22, -18.7) scale(0.55)">
      <path fill="#E8500A" d="M40 0 L8 18.48 L40 36.95 L72 18.48Z" />
      <path fill="#FFFFFF" d="M0 18.48 L65 56 L65 27.14 L80 18.48 L80 59.34 L65 68 L15 39.14 L15 68 L0 59.34Z" />
    </g>
  )
}

function IlustracionHero() {
  const [animar, setAnimar] = useState(() =>
    typeof window !== 'undefined'
      ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setAnimar(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div
      className="hidden lg:flex flex-col items-center gap-6 flex-1 basis-[380px] min-w-0"
      aria-hidden="true"
    >
      <svg viewBox="0 0 440 220" className="w-full max-w-[420px]">
        {/* Ruta punteada */}
        <path
          id="ruta-hero"
          d={RUTA_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeDasharray="5 10"
          strokeLinecap="round"
        />

        {/* Nodo: Origen */}
        <circle cx="50" cy="185" r="9" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="50" cy="185" r="4" fill="rgba(255,255,255,0.45)" />

        {/* Nodo: Tránsito */}
        <circle cx="220" cy="107" r="7" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <circle cx="220" cy="107" r="3" fill="rgba(255,255,255,0.35)" />

        {/* Nodo: Destino con halo naranja */}
        <circle cx="390" cy="55" r="26" fill="rgba(232,80,10,0.08)" />
        <circle cx="390" cy="55" r="15" fill="rgba(232,80,10,0.18)" />
        <rect x="381" y="46" width="18" height="18" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <rect x="385" y="50" width="10" height="10" rx="2.5" fill="rgba(255,255,255,0.45)" />

        {/* Paquete (isotipo): animado o estático */}
        {animar ? (
          <g>
            <IsotipoMini />
            <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" rotate="0">
              <mpath href="#ruta-hero" />
            </animateMotion>
          </g>
        ) : (
          // Sin animación: paquete en el punto intermedio de la ruta
          <g transform="translate(220, 107)">
            <IsotipoMini />
          </g>
        )}
      </svg>

      {/* Etapas genéricas */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {[
          { dot: 'bg-[#94A3B8]', label: 'Recibido' },
          { dot: 'bg-accent', label: 'En tránsito' },
          { dot: 'bg-[#34D399]', label: 'Entregado' },
        ].map(({ dot, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#C9D3E3] bg-white/8 px-3 py-1.5 rounded-full border border-white/12"
          >
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate()
  const [inputGuia, setInputGuia] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputGuia(formatarInputGuia(e.target.value))
    setError('')
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    const norm = normalizarGuia(inputGuia)
    if (!norm || !validarGuia(norm)) {
      setError(t.rastreo.guiaInvalida)
      return
    }
    navigate(`/rastreo/${norm}`)
  }

  return (
    <section id="inicio" className="relative overflow-hidden bg-navy text-white">
      {/* Motivo de rutas decorativo */}
      <svg
        viewBox="0 0 1440 640"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full opacity-55 pointer-events-none"
      >
        <g fill="none" stroke="#3A5A8C" strokeWidth="1.2" strokeDasharray="3 7">
          <path d="M140 470 Q 420 180 760 140" />
          <path d="M760 140 Q 1040 60 1320 220" />
          <path d="M300 570 Q 640 420 980 520" />
          <path d="M980 520 Q 1180 380 1320 220" />
          <path d="M760 140 Q 860 330 980 520" />
        </g>
        <g fill="#5B7BAE">
          <circle cx="140" cy="470" r="4" />
          <circle cx="760" cy="140" r="4" />
          <circle cx="300" cy="570" r="4" />
          <circle cx="1320" cy="220" r="4" />
        </g>
        <circle cx="980" cy="520" r="7" fill="#E8500A" />
        <circle cx="980" cy="520" r="18" fill="none" stroke="#E8500A" strokeOpacity="0.45" />
      </svg>

      <div className="relative max-w-[1240px] mx-auto px-6 pt-[88px] pb-24 flex flex-wrap gap-14 items-center">
        {/* Columna izquierda */}
        <div className="flex-1 basis-[520px] min-w-0 flex flex-col gap-6">
          <p className="m-0 font-mono text-[13px] tracking-[0.14em] text-[#F4A97C]">
            ENVÍOS INTERNACIONALES PUERTA A PUERTA
          </p>
          <h1
            className="m-0 font-display font-extrabold leading-[1.04] tracking-tight text-white"
            style={{ fontSize: 'clamp(40px, 5.2vw, 64px)' }}
          >
            Tu paquete, desde cualquier parte del mundo hasta tu puerta.
          </h1>
          <p className="m-0 text-[19px] leading-[1.55] text-[#C9D3E3] max-w-[540px]">
            Enviamos paquetes entre países y entre estados: de Texas a Ontario, de Jalisco a California o de Madrid a Miami. Sigue cada paso en el mapa, en tiempo real, con tu número de guía.
          </p>

          {/* Buscador */}
          <form
            id="rastrear"
            onSubmit={handleBuscar}
            noValidate
            className="mt-2 bg-white rounded-2xl p-2.5 flex flex-wrap gap-2.5 max-w-[580px]"
          >
            <label htmlFor="guia-home" className="sr-only">Número de guía</label>
            <input
              ref={inputRef}
              id="guia-home"
              type="text"
              inputMode="text"
              value={inputGuia}
              onChange={handleChange}
              placeholder="NXP-XXXXXXX"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={error ? 'guia-home-error' : undefined}
              aria-invalid={!!error}
              className="flex-1 basis-[260px] min-w-0 min-h-[56px] border-0 rounded-[10px] bg-canvas px-[18px] font-mono text-xl tracking-[0.06em] text-navy outline-none focus:ring-2 focus:ring-navy/30 placeholder:text-ink-muted/50"
            />
            <button
              type="submit"
              className="flex-none min-h-[56px] px-7 border-0 rounded-[10px] bg-accent-strong text-white font-semibold text-[17px] hover:bg-accent transition-colors cursor-pointer"
            >
              Rastrear envío
            </button>
          </form>
          {error && (
            <p id="guia-home-error" role="alert" className="text-sm text-red-300 -mt-2">
              {error}
            </p>
          )}

          {/* Features */}
          <div className="flex flex-wrap gap-[22px] text-sm text-[#C9D3E3]">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399]" />
              Actualización en tiempo real
            </span>
            <span>Sin registro ni contraseña</span>
            <span>Notificación en cada etapa</span>
          </div>
        </div>

        {/* Ilustración decorativa — sin datos reales */}
        <IlustracionHero />
      </div>
    </section>
  )
}

// ── Accesos rápidos ───────────────────────────────────────────────────────────

function AccesosRapidos({ urlWa }: { urlWa: string | null }) {
  const accesos = [
    {
      href: '#rastrear',
      icono: <Search size={22} strokeWidth={1.8} aria-hidden="true" />,
      iconoBg: 'bg-icon-bg text-navy',
      titulo: 'Sigue tu envío',
      desc: 'Estado e historial con tu número de guía.',
    },
    {
      href: urlWa ? `${urlWa}?text=${encodeURIComponent('Hola, quiero cotizar un envío.')}` : '#contacto',
      externo: !!urlWa,
      icono: <FileText size={22} strokeWidth={1.8} aria-hidden="true" />,
      iconoBg: 'bg-accent-soft text-accent-strong',
      titulo: 'Cotiza tu envío',
      desc: 'Precio según peso, origen y servicio.',
    },
    ...(urlWa ? [{
      href: urlWa,
      externo: true,
      icono: <MessageCircle size={22} strokeWidth={1.8} aria-hidden="true" />,
      iconoBg: 'bg-[#E7F7EF] text-[#047857]',
      titulo: 'WhatsApp',
      desc: 'Resolvemos tus dudas en minutos.',
    }] : []),
    {
      href: '#rutas',
      icono: <Globe size={22} strokeWidth={1.8} aria-hidden="true" />,
      iconoBg: 'bg-icon-bg text-navy',
      titulo: 'Rutas y tiempos',
      desc: 'Corredores que operamos y tiempos.',
    },
  ]

  return (
    <section aria-label="Accesos rápidos" className="max-w-[1240px] mx-auto px-6 pt-10 pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accesos.map(({ href, externo, icono, iconoBg, titulo, desc }) => (
          <a
            key={titulo}
            href={href}
            target={externo ? '_blank' : undefined}
            rel={externo ? 'noopener noreferrer' : undefined}
            className="flex gap-4 items-start bg-surface border border-border-subtle rounded-2xl p-[22px] no-underline text-ink hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span className={`flex-none w-11 h-11 rounded-xl flex items-center justify-center ${iconoBg}`}>
              {icono}
            </span>
            <span className="flex flex-col gap-1">
              <strong className="text-base font-semibold">{titulo}</strong>
              <span className="text-sm text-ink-muted">{desc}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

// ── Rutas ─────────────────────────────────────────────────────────────────────

function TiemposRuta({
  estandar,
  express,
}: {
  estandar: string | null
  express: string | null
}) {
  if (!estandar && !express) return null
  return (
    <div className="flex justify-between text-sm text-ink-muted border-t border-[#E3E8F0] pt-3.5">
      {estandar && <span>Estándar {estandar} días</span>}
      {express && <span>Express {express} días</span>}
    </div>
  )
}

function Rutas({ tiempos }: { tiempos: import('../../hooks/useConfiguracionSitio').TiemposCorredores }) {
  return (
    <section id="rutas" className="max-w-[1240px] mx-auto px-6 pt-28 pb-10">
      <div className="flex flex-wrap justify-between items-end gap-6 mb-10">
        <div className="max-w-[620px] flex flex-col gap-3">
          <p className="m-0 font-mono text-[13px] tracking-[0.14em] uppercase text-accent-strong">Rutas</p>
          <h2
            className="m-0 font-display font-extrabold leading-[1.1] text-navy"
            style={{ fontSize: 'clamp(32px, 3.6vw, 44px)' }}
          >
            De cualquier ciudad a cualquier ciudad, entre países o entre estados.
          </h2>
        </div>
        <p className="m-0 text-base text-ink-muted max-w-[360px]">
          Tiempos de referencia en días hábiles. Pueden variar según los trámites de aduana.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* US ⇄ CA */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-[26px] flex flex-col gap-[18px]">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] font-semibold text-navy bg-icon-bg px-2.5 py-1 rounded-md">US ⇄ CA</span>
            <span className="text-[13px] text-ink-muted">Transfronterizo</span>
          </div>
          <strong className="font-display text-2xl font-bold leading-tight">Estados Unidos y Canadá</strong>
          <TiemposRuta
            estandar={formatearRangoDias(tiempos.usca, 'estandar')}
            express={formatearRangoDias(tiempos.usca, 'express')}
          />
        </div>
        {/* MX → US */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-[26px] flex flex-col gap-[18px]">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] font-semibold text-navy bg-icon-bg px-2.5 py-1 rounded-md">MX → US</span>
            <span className="text-[13px] text-ink-muted">Norteamérica</span>
          </div>
          <strong className="font-display text-2xl font-bold leading-tight">México y Estados Unidos</strong>
          <TiemposRuta
            estandar={formatearRangoDias(tiempos.mxus, 'estandar')}
            express={formatearRangoDias(tiempos.mxus, 'express')}
          />
        </div>
        {/* TX → FL */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-[26px] flex flex-col gap-[18px]">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] font-semibold text-navy bg-icon-bg px-2.5 py-1 rounded-md">TX → FL</span>
            <span className="text-[13px] text-ink-muted">Nacional</span>
          </div>
          <strong className="font-display text-2xl font-bold leading-tight">Entre estados</strong>
          <TiemposRuta
            estandar={formatearRangoDias(tiempos.estados, 'estandar')}
            express={formatearRangoDias(tiempos.estados, 'express')}
          />
        </div>
        {/* ¿Otra ruta? */}
        <div className="bg-navy text-white rounded-2xl p-[26px] flex flex-col gap-[18px]">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[13px] font-semibold text-navy bg-white px-2.5 py-1 rounded-md">? → ?</span>
            <span className="text-[13px] text-[#C9D3E3]">A la medida</span>
          </div>
          <strong className="font-display text-2xl font-bold leading-tight">¿Otra ruta?</strong>
          <span className="text-sm text-[#C9D3E3] border-t border-white/15 pt-3.5">
            Cuéntanos origen y destino y te cotizamos.
          </span>
        </div>
      </div>
    </section>
  )
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────

function ComoFunciona() {
  const pasos = [
    {
      num: '01',
      titulo: 'Recibimos tu paquete',
      desc: 'Llega a nuestra bodega de origen y te asignamos una guía NXP.',
    },
    {
      num: '02',
      titulo: 'Viaja a su destino',
      desc: 'Cada escala del recorrido queda marcada en el mapa.',
    },
    {
      num: '03',
      titulo: 'Gestionamos la aduana',
      desc: 'Nos encargamos de los trámites y te avisamos si hay una novedad.',
    },
    {
      num: '04',
      titulo: 'Lo entregamos en tu puerta',
      desc: 'Reparto local hasta la dirección del destinatario.',
    },
  ]

  return (
    <section id="como" className="max-w-[1240px] mx-auto px-6 py-24">
      <div className="flex flex-wrap gap-14">
        {/* Columna izquierda */}
        <div className="flex-1 basis-[340px] min-w-0 flex flex-col gap-3.5">
          <p className="m-0 font-mono text-[13px] tracking-[0.14em] uppercase text-accent-strong">Cómo funciona</p>
          <h2
            className="m-0 font-display font-extrabold leading-[1.1] text-navy"
            style={{ fontSize: 'clamp(32px, 3.6vw, 44px)' }}
          >
            Ves en el mapa dónde está tu paquete.
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] text-ink-muted">
            Cada vez que tu envío llega a un nuevo punto, nuestro equipo lo marca en el mapa y tú lo ves al instante, sin recargar la página.
          </p>
        </div>
        {/* Pasos */}
        <ol
          className="flex-[2] basis-[560px] min-w-0 list-none m-0 p-0 grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {pasos.map(({ num, titulo, desc }) => (
            <li
              key={num}
              className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col gap-2.5"
            >
              <span className="font-mono text-sm font-semibold text-accent-strong">{num}</span>
              <strong className="text-lg font-semibold">{titulo}</strong>
              <span className="text-[15px] leading-relaxed text-ink-muted">{desc}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── Servicios ─────────────────────────────────────────────────────────────────

function Servicios({
  precioEstandar,
  precioExpress,
  moneda,
  unidadPeso,
  urlWa,
}: {
  precioEstandar: number | null
  precioExpress: number | null
  moneda: string
  unidadPeso: string
  urlWa: string | null
}) {
  function labelPrecio(precio: number | null) {
    if (precio == null) return 'Cotiza tu envío'
    return `Desde ${moneda} ${precio.toFixed(2)} / ${unidadPeso}`
  }

  function hrefCotizar(tipo: string) {
    if (!urlWa) return '#contacto'
    return `${urlWa}?text=${encodeURIComponent(`Hola, quiero cotizar el servicio ${tipo}.`)}`
  }

  return (
    <section id="servicios" className="bg-surface border-t border-b border-border-subtle">
      <div className="max-w-[1240px] mx-auto px-6 py-24 flex flex-col gap-10">
        <div className="max-w-[640px] flex flex-col gap-3">
          <p className="m-0 font-mono text-[13px] tracking-[0.14em] uppercase text-accent-strong">Servicios</p>
          <h2
            className="m-0 font-display font-extrabold leading-[1.1] text-navy"
            style={{ fontSize: 'clamp(32px, 3.6vw, 44px)' }}
          >
            Elige la velocidad que necesitas.
          </h2>
        </div>
        <div className="flex flex-wrap gap-5">
          {/* Estándar */}
          <div className="flex-1 basis-[380px] min-w-0 border border-border-subtle rounded-[20px] p-8 flex flex-col gap-5">
            <span className="font-mono text-[13px] tracking-[0.12em] text-ink-muted">ESTÁNDAR</span>
            <strong className="font-display font-extrabold text-[34px] text-navy leading-tight">
              {labelPrecio(precioEstandar)}
            </strong>
            <ul className="m-0 p-0 list-none flex flex-col gap-2.5 text-base text-[#374151]">
              <li>Ideal para compras sin afán</li>
              <li>Rastreo en tiempo real</li>
              <li>Consolidación de varios paquetes</li>
            </ul>
            <a
              href={hrefCotizar('estándar')}
              target={urlWa ? '_blank' : undefined}
              rel={urlWa ? 'noopener noreferrer' : undefined}
              className="self-start inline-flex items-center min-h-[48px] px-[22px] rounded-[10px] border border-navy text-navy font-semibold hover:bg-navy hover:text-white transition-colors cursor-pointer no-underline"
            >
              Cotizar estándar
            </a>
          </div>
          {/* Express */}
          <div className="flex-1 basis-[380px] min-w-0 bg-navy text-white rounded-[20px] p-8 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[13px] tracking-[0.12em] text-[#C9D3E3]">EXPRESS</span>
              <span className="text-xs font-semibold bg-accent text-white px-2.5 py-1 rounded-full">Más rápido</span>
            </div>
            <strong className="font-display font-extrabold text-[34px] leading-tight">
              {labelPrecio(precioExpress)}
            </strong>
            <ul className="m-0 p-0 list-none flex flex-col gap-2.5 text-base text-[#DCE3EE]">
              <li>Prioridad en vuelo y en aduana</li>
              <li>Rastreo en tiempo real</li>
              <li>Entrega prioritaria en destino</li>
            </ul>
            <a
              href={hrefCotizar('express')}
              target={urlWa ? '_blank' : undefined}
              rel={urlWa ? 'noopener noreferrer' : undefined}
              className="self-start inline-flex items-center min-h-[48px] px-[22px] rounded-[10px] bg-accent-strong text-white font-semibold hover:bg-accent transition-colors cursor-pointer no-underline"
            >
              Cotizar express
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Contacto ──────────────────────────────────────────────────────────────────

function Contacto({
  urlWa,
  telefono,
}: {
  urlWa: string | null
  telefono: string
}) {
  return (
    <section id="contacto" className="max-w-[1240px] mx-auto px-6 py-24">
      <div className="bg-accent rounded-3xl px-12 py-12 flex flex-wrap items-center justify-between gap-7">
        <div className="max-w-[620px] flex flex-col gap-2.5">
          <h2
            className="m-0 font-display font-extrabold leading-[1.1] text-[#1A0A02]"
            style={{ fontSize: 'clamp(28px, 3vw, 38px)' }}
          >
            ¿Tienes un paquete en camino o quieres cotizar?
          </h2>
          <p className="m-0 text-[17px] text-[#2B1205]">
            Escríbenos y te respondemos en horario de oficina.
          </p>
        </div>
        {urlWa && (
          <a
            href={urlWa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 min-h-[56px] px-[26px] rounded-xl bg-navy text-white text-[17px] font-semibold hover:bg-navy/90 transition-colors cursor-pointer no-underline"
          >
            <MessageCircle size={20} strokeWidth={1.8} aria-hidden="true" />
            WhatsApp{telefono ? ` ${telefono}` : ''}
          </a>
        )}
      </div>
    </section>
  )
}

// ── Pie de página ─────────────────────────────────────────────────────────────

function Pie({
  direccion,
  ciudad,
  correo,
  telefono,
  razonSocial,
  nit,
}: {
  direccion: string
  ciudad: string
  correo: string
  telefono: string
  razonSocial: string
  nit: string
}) {
  const ubicacion = [direccion, ciudad].filter(Boolean).join(', ')
  const tieneContacto = !!(ubicacion || correo || telefono)

  let lineaLegal = `© ${new Date().getFullYear()} Nexpak`
  if (razonSocial && nit) lineaLegal += ` · ${razonSocial} · NIT ${nit}`
  else if (razonSocial) lineaLegal += ` · ${razonSocial}`

  return (
    <footer className="bg-navy-deep text-[#C9D3E3]">
      <div className="max-w-[1240px] mx-auto px-6 pt-14 pb-8 flex flex-col gap-10">
        <div className="flex flex-wrap justify-between gap-10">
          {/* Marca */}
          <div className="flex flex-col gap-3.5 max-w-[320px]">
            <Logo variante="horizontal" tono="blanco" alto={28} alt="Nexpak" />
            <p className="m-0 text-sm leading-relaxed">
              Envíos internacionales puerta a puerta, entre países y entre estados.
            </p>
          </div>
          {/* Contacto + legal */}
          <div className="flex flex-wrap gap-14 text-sm">
            {tieneContacto && (
              <div className="flex flex-col gap-2.5">
                <strong className="text-white font-semibold">Contacto</strong>
                {ubicacion && <span>{ubicacion}</span>}
                {correo && <span>{correo}</span>}
                {telefono && <span>{telefono}</span>}
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              <strong className="text-white font-semibold">Legal</strong>
              <Link to="/privacidad" className="text-[#C9D3E3] hover:text-white transition-colors">Política de datos personales</Link>
              <Link to="/aviso-privacidad" className="text-[#C9D3E3] hover:text-white transition-colors">Aviso de privacidad</Link>
              <Link to="/terminos" className="text-[#C9D3E3] hover:text-white transition-colors">Términos del servicio</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/12 pt-5 text-[13px] text-[#94A3B8]">
          {lineaLegal}
        </div>
      </div>
    </footer>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function InicioPage() {
  const { config } = useConfiguracionSitio()

  useEffect(() => {
    document.title = t.rastreo.seoTituloInicio
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.rastreo.seoDescInicio)
    document.querySelector('meta[name="robots"]')?.remove()
  }, [])

  const urlWa = config.whatsapp ? urlWhatsAppConfig(config) : null

  return (
    <>
      <Encabezado urlWa={urlWa} />
      <Hero />
      <AccesosRapidos urlWa={urlWa} />
      <Rutas tiempos={config.tiempos} />
      <ComoFunciona />
      <Servicios
        precioEstandar={config.precio_desde_estandar}
        precioExpress={config.precio_desde_express}
        moneda={config.moneda}
        unidadPeso={config.unidad_peso}
        urlWa={urlWa}
      />
      <Contacto urlWa={urlWa} telefono={config.telefono} />
      <Pie
        direccion={config.direccion}
        ciudad={config.ciudad}
        correo={config.correo}
        telefono={config.telefono}
        razonSocial={config.razon_social}
        nit={config.nit}
      />
    </>
  )
}
