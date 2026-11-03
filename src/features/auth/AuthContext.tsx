import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export interface Perfil {
  id: string
  nombre: string
  rol: 'admin' | 'operador'
  activo: boolean
}

interface AuthContextValue {
  session: Session | null
  perfil: Perfil | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  // true solo durante la carga inicial; jamás vuelve a true tras el primer evento
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let mounted = true
    let initialDone = false
    let lastUserId: string | null = null

    async function cargarPerfil(userId: string) {
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre, rol, activo')
        .eq('id', userId)
        .single()
      if (mounted) setPerfil(data ?? null)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      // Cierre de sesión o sesión nula
      if (event === 'SIGNED_OUT' || !newSession) {
        lastUserId = null
        setSession(null)
        setPerfil(null)
        setCargando(false)
        initialDone = true
        return
      }

      // Actualiza la sesión de forma síncrona (siempre seguro)
      setSession(newSession)

      const userId = newSession.user.id

      if (!initialDone) {
        // Primer evento: carga el perfil y apaga el spinner
        initialDone = true
        lastUserId = userId
        // Defer para no bloquear el callback de onAuthStateChange
        setTimeout(() => {
          cargarPerfil(userId).then(() => {
            if (mounted) setCargando(false)
          })
        }, 0)
      } else if (userId !== lastUserId) {
        // Usuario distinto: recarga el perfil sin mostrar spinner
        lastUserId = userId
        setTimeout(() => {
          if (mounted) cargarPerfil(userId)
        }, 0)
      }
      // TOKEN_REFRESHED / SIGNED_IN del mismo usuario:
      // la sesión ya se actualizó arriba; no hay que hacer nada más
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // sin dependencias: se suscribe una sola vez

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
