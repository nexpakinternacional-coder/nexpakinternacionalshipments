import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { t } from '../../textos/es'

export default function ProtectedRoute() {
  const { session, perfil, cargando, cerrarSesion } = useAuth()
  const [sinAcceso, setSinAcceso] = useState(false)

  const perfilInactivo =
    !cargando && session !== null && (perfil === null || !perfil.activo)

  useEffect(() => {
    if (perfilInactivo && !sinAcceso) {
      setSinAcceso(true)
      cerrarSesion()
    }
  }, [perfilInactivo, sinAcceso, cerrarSesion])

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <span className="text-ink-muted text-sm">{t.comun.cargando}</span>
      </div>
    )
  }

  if (sinAcceso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div
          className="bg-surface border border-border rounded-xl p-8 max-w-sm w-full text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <p className="font-semibold text-ink mb-2">{t.auth.sinAcceso}</p>
          <p className="text-ink-muted text-sm">{t.auth.sinAccesoDetalle}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
