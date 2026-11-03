import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { t } from '../../textos/es'

export default function ProtectedRoute() {
  const { session, perfil, cargandoSesion, estadoPerfil, cerrarSesion, reintentarPerfil } = useAuth()

  if (cargandoSesion || estadoPerfil === 'cargando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <span className="text-ink-muted text-sm">{t.comun.cargando}</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  if (estadoPerfil === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div
          className="bg-surface border border-border rounded-xl p-8 max-w-sm w-full text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <p className="font-semibold text-ink mb-2">{t.auth.errorPerfil}</p>
          <p className="text-ink-muted text-sm mb-5">{t.auth.errorPerfilDetalle}</p>
          <button
            onClick={reintentarPerfil}
            className="px-5 py-2 bg-accent-strong text-white font-semibold rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer"
          >
            {t.auth.reintentar}
          </button>
        </div>
      </div>
    )
  }

  if (!perfil || !perfil.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div
          className="bg-surface border border-border rounded-xl p-8 max-w-sm w-full text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <p className="font-semibold text-ink mb-2">{t.auth.sinAcceso}</p>
          <p className="text-ink-muted text-sm mb-5">{t.auth.sinAccesoDetalle}</p>
          <button
            onClick={cerrarSesion}
            className="px-5 py-2 border border-border text-ink rounded-lg text-sm hover:bg-canvas transition-colors cursor-pointer"
          >
            {t.auth.cerrarSesion}
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
