import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { t } from '../textos/es'
import Logo from '../components/Logo'

interface NavItemDef {
  to: string
  icon: LucideIcon
  label: string
  esActivo: (pathname: string) => boolean
}

const NAV_ITEMS: NavItemDef[] = [
  {
    to: '/admin',
    icon: LayoutDashboard,
    label: t.nav.resumen,
    esActivo: p => p === '/admin',
  },
  {
    to: '/admin/envios',
    icon: Package,
    label: t.nav.envios,
    // Activo en /admin/envios y /admin/envios/:id, pero NO en /admin/envios/nuevo
    esActivo: p =>
      p === '/admin/envios' ||
      (p.startsWith('/admin/envios/') && p !== '/admin/envios/nuevo'),
  },
  {
    to: '/admin/envios/nuevo',
    icon: PackagePlus,
    label: t.nav.nuevoEnvio,
    esActivo: p => p === '/admin/envios/nuevo',
  },
]

function NavItem({ item }: { item: NavItemDef }) {
  const { pathname } = useLocation()
  const activo = item.esActivo(pathname)

  return (
    <Link
      to={item.to}
      aria-current={activo ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        activo ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
      }`}
    >
      <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
      {item.label}
    </Link>
  )
}

function SidebarBody() {
  const { perfil, cerrarSesion } = useAuth()
  return (
    <div className="flex flex-col h-full">
      <nav
        className="flex-1 px-3 py-4 space-y-0.5"
        aria-label="Navegación principal"
      >
        {NAV_ITEMS.map(item => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        {perfil && (
          <div className="mb-3">
            <p className="text-white text-sm font-medium leading-tight">
              {perfil.nombre}
            </p>
            <p className="text-white/50 text-xs capitalize mt-0.5">{perfil.rol}</p>
          </div>
        )}
        <button
          onClick={cerrarSesion}
          className="flex items-center gap-2 text-white/55 hover:text-white text-xs transition-colors cursor-pointer"
        >
          <LogOut size={14} aria-hidden="true" />
          {t.auth.cerrarSesion}
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  // Bloquear scroll del body mientras el menú móvil esté abierto
  useEffect(() => {
    if (menuAbierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuAbierto])

  return (
    <div className="fixed inset-0 flex bg-canvas">
      {/* Sidebar — escritorio */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy flex-shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <Link to="/admin" aria-label="Nexpak — ir al panel">
            <Logo variante="horizontal" tono="blanco" alto={28} alt="" />
          </Link>
        </div>
        <SidebarBody />
      </aside>

      {/* Overlay móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — móvil (deslizable) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-navy flex flex-col lg:hidden transition-transform duration-200 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú de navegación"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <Logo variante="horizontal" tono="blanco" alto={24} />
          <button
            onClick={() => setMenuAbierto(false)}
            className="text-white/60 hover:text-white transition-colors cursor-pointer p-1 -mr-1"
            aria-label="Cerrar menú"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <SidebarBody />
      </aside>

      {/* Área de contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra superior — solo móvil */}
        <header className="lg:hidden flex items-center px-4 py-3 bg-surface border-b border-border flex-shrink-0">
          <button
            onClick={() => setMenuAbierto(true)}
            className="text-ink p-1 -ml-1 cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Logo variante="isotipo" tono="color" alto={28} className="ml-3" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
