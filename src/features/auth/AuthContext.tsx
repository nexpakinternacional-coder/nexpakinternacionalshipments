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

export type EstadoPerfil = 'cargando' | 'listo' | 'error'

interface AuthContextValue {
  session: Session | null
  perfil: Perfil | null
  /** true solo durante la carga inicial de la sesión (antes del primer evento) */
  cargandoSesion: boolean
  /** estado de la carga del perfil, independiente de cargandoSesion */
  estadoPerfil: EstadoPerfil
  cerrarSesion: () => Promise<void>
  reintentarPerfil: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [estadoPerfil, setEstadoPerfil] = useState<EstadoPerfil>('cargando')
  const [reintentoCount, setReintentoCount] = useState(0)

  useEffect(() => {
    let mounted = true
    let initialDone = false
    let lastUserId: string | null = null

    async function cargarPerfil(userId: string) {
      setEstadoPerfil('cargando')
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('id, nombre, rol, activo')
          .eq('id', userId)
          .single()
        if (!mounted) return
        if (error) {
          console.error('[AuthContext] Error al cargar perfil:', error)
          setEstadoPerfil('error')
        } else {
          setPerfil(data ?? null)
          setEstadoPerfil('listo')
        }
      } catch (err) {
        if (!mounted) return
        console.error('[AuthContext] Error inesperado al cargar perfil:', err)
        setEstadoPerfil('error')
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !newSession) {
        lastUserId = null
        setSession(null)
        setPerfil(null)
        setEstadoPerfil('listo')
        setCargandoSesion(false)
        initialDone = true
        return
      }

      // Actualiza la sesión de forma síncrona — siempre seguro
      setSession(newSession)

      const userId = newSession.user.id

      if (!initialDone) {
        // Primer evento: apaga el spinner de sesión y carga el perfil
        initialDone = true
        lastUserId = userId
        setCargandoSesion(false)
        // Diferir para no bloquear el callback de onAuthStateChange
        setTimeout(() => {
          if (mounted) cargarPerfil(userId)
        }, 0)
      } else if (userId !== lastUserId) {
        // Usuario distinto (login con otra cuenta): recargar perfil
        lastUserId = userId
        setTimeout(() => {
          if (mounted) cargarPerfil(userId)
        }, 0)
      }
      // TOKEN_REFRESHED / SIGNED_IN del mismo usuario:
      // la sesión ya se actualizó; no hay que hacer nada más
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  // reintentoCount permite forzar una nueva carga de perfil sin re-suscribir
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reintentoCount])

  const cerrarSesion = useCallback(async () => {
    try {
      // scope: 'local' cierra solo este navegador; evita el 403 de scope global
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Si falla, limpiar la sesión local de todas formas
      setSession(null)
      setPerfil(null)
      setEstadoPerfil('listo')
    }
  }, [])

  const reintentarPerfil = useCallback(() => {
    setReintentoCount(n => n + 1)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, perfil, cargandoSesion, estadoPerfil, cerrarSesion, reintentarPerfil }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
