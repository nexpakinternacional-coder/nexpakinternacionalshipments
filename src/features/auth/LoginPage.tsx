import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import { t } from '../../textos/es'

function mapearError(error: AuthError): string {
  const msg = error.message.toLowerCase()
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password')
  ) {
    return t.auth.errorCredenciales
  }
  if (
    error.status === 429 ||
    msg.includes('too many') ||
    msg.includes('rate limit')
  ) {
    return t.auth.errorDemasiadosIntentos
  }
  return t.errores.servidorError
}

export default function LoginPage() {
  const { session, cargando } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) {
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError(mapearError(authError))
      }
    } catch {
      setError(t.auth.errorSinConexion)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div
          className="bg-surface border border-border rounded-xl p-8"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {/* Logo + título */}
          <div className="mb-8">
            <p className="text-navy font-semibold text-2xl tracking-wide">Nexpak</p>
            <p className="text-ink-muted text-sm mt-1">{t.auth.tituloLogin}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
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
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
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
    </main>
  )
}
