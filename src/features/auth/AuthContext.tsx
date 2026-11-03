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
  const [cargando, setCargando] = useState(true)

  const cargarPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, rol, activo')
      .eq('id', userId)
      .single()
    setPerfil(data ?? null)
  }, [])

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        setCargando(true)
        await cargarPerfil(newSession.user.id)
        if (mounted) setCargando(false)
      } else {
        setPerfil(null)
        setCargando(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [cargarPerfil])

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
