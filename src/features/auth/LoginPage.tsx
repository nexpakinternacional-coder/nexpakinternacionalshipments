import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import { t } from '../../textos/es'
import Logo from '../../components/Logo'

function mapearError(error: AuthError): string {
  const msg = error.message.toLowerCase()
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password')
  ) {
    return t.auth.errorCredenciales
  }
  if (error.status === 429 || msg.includes('too many') || msg.includes('rate limit')) {
    return t.auth.errorDemasiadosIntentos
  }
  return t.errores.servidorError
}

// SVG decorativo de rutas de envío
function GraficoRutas() {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xs opacity-25"
      aria-hidden="true"
    >
      {/* Líneas de ruta */}
      <path d="M20 110 Q80 40 160 80 Q240 120 300 60" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M20 160 Q100 100 180 140 Q240 170 300 130" stroke="white" strokeWidth="1" strokeDasharray="4 6" />
      <path d="M20 60 Q90 90 150 50 Q220 10 300 90" stroke="white" strokeWidth="1" strokeDasharray="5 5" />
      {/* Nodos de origen/destino */}
      <circle cx="20"  cy="110" r="5" fill="white" />
      <circle cx="300" cy="60"  r="5" fill="white" />
      <circle cx="20"  cy="160" r="4" fill="white" fillOpacity="0.6" />
      <circle cx="300" cy="130" r="4" fill="white" fillOpacity="0.6" />
      <circle cx="20"  cy="60"  r="3" fill="white" fillOpacity="0.4" />
      <circle cx="300" cy="90"  r="3" fill="white" fillOpacity="0.4" />
      {/* Punto intermedio animado */}
      <circle cx="160" cy="80" r="6" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
      <circle cx="160" cy="80" r="3" fill="white" />
      {/* Aviones pequeños */}
      <g transform="translate(230,55) rotate(-20)">
        <polygon points="0,-5 3,5 0,2 -3,5" fill="white" fillOpacity="0.7" />
      </g>
      <g transform="translate(100,145) rotate(-10)">
        <polygon points="0,-4 2.5,4 0,1.5 -2.5,4" fill="white" fillOpacity="0.5" />
      </g>
      {/* Cuadrante de globo abstracto */}
      <ellipse cx="160" cy="110" rx="130" ry="80" stroke="white" strokeWidth="0.5" strokeOpacity="0.15" strokeDasharray="3 8" />
      <line x1="30"  y1="110" x2="290" y2="110" stroke="white" strokeWidth="0.4" strokeOpacity="0.15" strokeDasharray="2 10" />
    </svg>
  )
}

export default function LoginPage() {
  const { session, cargandoSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <span className="text-ink-muted text-sm">{t.comun.cargando}</span>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(mapearError(authError))
    } catch {
      setError(t.auth.errorSinConexion)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas flex">
      {/* ── Panel izquierdo (solo escritorio) ──────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-5/12 bg-navy p-12 select-none">
        {/* Logo */}
        <Logo variante="horizontal" tono="blanco" alto={32} />

        {/* Gráfico decorativo */}
        <div className="flex justify-center">
          <GraficoRutas />
        </div>

        {/* Tagline */}
        <div>
          <p className="text-white text-xl font-semibold leading-snug">
            Envíos internacionales,<br />sin fronteras.
          </p>
          <p className="text-white/55 text-sm mt-3 leading-relaxed max-w-xs">
            Rastrea, gestiona y actualiza cada paquete desde el origen hasta la entrega.
          </p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo (solo móvil) */}
          <div className="lg:hidden flex justify-center mb-10">
            <Logo variante="horizontal" tono="color" alto={32} />
          </div>

          {/* Card del formulario */}
          <div
            className="bg-surface border border-border rounded-xl p-8"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <div className="mb-8">
              <p className="text-navy font-semibold text-lg">{t.auth.tituloLogin}</p>
              <p className="text-ink-muted text-sm mt-1">Accede al panel de administración.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-ink mb-1.5">
                  {t.auth.email}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ejemplo.com"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink bg-surface placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-ink mb-1.5">
                  {t.auth.contrasena}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
                >
                  {error}
                </div>
              )}

              {/* Botón */}
              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-accent-strong text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {enviando ? t.auth.cargando : t.auth.botonIngresar}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
