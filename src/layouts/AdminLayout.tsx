import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthContext'
import { normalizarGuia, validarGuia } from '../lib/guia'
import { t } from '../textos/es'
import Logo from '../components/Logo'

// ── Helpers ────────────────────────────────────────────────────────────────────

function obtenerIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Tipos de ítem de nav ───────────────────────────────────────────────────────

interface NavItemDef {
  to: string
  icon: LucideIcon
  label: string
  esActivo: (pathname: string) => boolean
  contador?: number | null
}

interface NavItemDeshabilitadoDef {
  icon: LucideIcon
  label: string
}

// ── Ítem activo / inactivo ─────────────────────────────────────────────────────

function NavItem({ item }: { item: NavItemDef }) {
  const { pathname } = useLocation()
  const activo = item.esActivo(pathname)

  return (
    <Link
      to={item.to}
      aria-current={activo ? 'page' : undefined}
      className={`flex items-center gap-3 min-h-11 px-3 rounded-[10px] text-sm font-medium transition-colors ${
        activo
          ? 'bg-white/10 text-white shadow-[inset_3px_0_0_#E8500A]'
          : 'text-[#DCE3EE] hover:bg-white/10 hover:text-white'
      }`}
    >
      <item.icon size={18} strokeWidth={1.75} aria-hidden="true" className="flex-shrink-0" />
      <span className="flex-1 min-w-0">{item.label}</span>
      {item.contador != null && (
        <span className="font-mono text-xs text-[#8FA3C4] flex-shrink-0 tabular-nums">
          {item.contador}
        </span>
      )}
    </Link>
  )
}

function NavItemDeshabilitado({ item }: { item: NavItemDeshabilitadoDef }) {
  return (
    <div
      className="flex items-center gap-3 min-h-11 px-3 rounded-[10px] text-sm opacity-40 cursor-not-allowed select-none"
      aria-disabled="true"
    >
      <item.icon size={18} strokeWidth={1.75} aria-hidden="true" className="flex-shrink-0 text-[#DCE3EE]" />
      <span className="flex-1 min-w-0 text-[#DCE3EE]">{item.label}</span>
      <span className="text-[10px] font-semibold tracking-wide text-[#8FA3C4] border border-[#8FA3C4]/40 rounded px-1.5 py-0.5 flex-shrink-0">
        Próximo
      </span>
    </div>
  )
}

// ── Buscador global ─────────────────────────────────────────────────────────────

function BuscadorGlobal() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busqueda, setBusqueda] = useState('')

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const val = busqueda.trim()
    if (!val) return

    const normalizada = normalizarGuia(val)
    if (validarGuia(val)) {
      const { data } = await supabase
        .from('envios')
        .select('id')
        .eq('guia', normalizada)
        .single()
      if (data) {
        navigate(`/admin/envios/${data.id}`)
        setBusqueda('')
        return
      }
    }

    navigate(`/admin/envios?q=${encodeURIComponent(val)}`)
    setBusqueda('')
  }

  return (
    <form role="search" onSubmit={handleSearch} className="flex-1 min-w-0 max-w-xl">
      <label htmlFor="buscador-global" className="sr-only">
        {t.nav.buscarPlaceholder}
      </label>
      <div className="flex items-center gap-2.5 min-h-11 px-3.5 bg-canvas border border-[#DDE3EC] rounded-[10px] text-[#5B6474] focus-within:border-[#C2410C]/40 focus-within:ring-2 focus-within:ring-[#C2410C]/10 transition-all">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          id="buscador-global"
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={t.nav.buscarPlaceholder}
          className="flex-1 min-w-0 bg-transparent text-[15px] text-ink placeholder:text-[#5B6474]/60 focus:outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center font-mono text-xs border border-[#C3CCDA] rounded px-1.5 py-0.5 text-[#5B6474] flex-shrink-0">
          Ctrl K
        </kbd>
      </div>
    </form>
  )
}

// ── Cuerpo del sidebar ──────────────────────────────────────────────────────────

function SidebarBody({ conteoEnvios }: { conteoEnvios: number | null }) {
  const { perfil, cerrarSesion } = useAuth()
  const esAdmin = perfil?.rol === 'admin'

  const operacion: NavItemDef[] = [
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
      esActivo: p =>
        p === '/admin/envios' ||
        (p.startsWith('/admin/envios/') && p !== '/admin/envios/nuevo'),
      contador: conteoEnvios,
    },
    {
      to: '/admin/envios/nuevo',
      icon: PackagePlus,
      label: t.nav.nuevoEnvio,
      esActivo: p => p === '/admin/envios/nuevo',
    },
  ]

  const control: NavItemDef[] = esAdmin
    ? [
        {
          to: '/admin/configuracion',
          icon: Settings,
          label: t.nav.configuracion,
          esActivo: p => p === '/admin/configuracion',
        },
      ]
    : []

  const controlDeshabilitados: NavItemDeshabilitadoDef[] = esAdmin
    ? [
        { icon: Lock, label: t.nav.auditoria },
        { icon: Users, label: t.nav.usuarios },
      ]
    : []

  const iniciales = perfil?.nombre ? obtenerIniciales(perfil.nombre) : '?'

  return (
    <div className="flex flex-col h-full">
      <nav
        className="flex-1 px-3 py-4 flex flex-col gap-5"
        aria-label="Navegación principal"
      >
        {/* OPERACIÓN */}
        <div className="flex flex-col gap-0.5">
          <span className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#8FA3C4]">
            OPERACIÓN
          </span>
          {operacion.map(item => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>

        {/* CONTROL — solo admin */}
        {esAdmin && (
          <div className="flex flex-col gap-0.5">
            <span className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#8FA3C4]">
              CONTROL
            </span>
            {control.map(item => (
              <NavItem key={item.to} item={item} />
            ))}
            {controlDeshabilitados.map(item => (
              <NavItemDeshabilitado key={item.label} item={item} />
            ))}
          </div>
        )}
      </nav>

      {/* Footer: avatar + nombre + rol + cerrar sesión */}
      <div className="px-3 py-4 border-t border-white/10 flex items-center gap-3">
        <span
          className="flex-none w-9 h-9 rounded-full bg-accent flex items-center justify-center font-semibold text-sm text-white"
          aria-hidden="true"
        >
          {iniciales}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {perfil?.nombre ?? ''}
          </p>
          <p className="text-xs text-[#8FA3C4] capitalize mt-0.5">
            {perfil?.rol ?? ''}
          </p>
        </div>
        <button
          onClick={cerrarSesion}
          className="flex-none w-11 h-11 flex items-center justify-center rounded-[10px] text-[#DCE3EE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label={t.auth.cerrarSesion}
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ── Layout principal ───────────────────────────────────────────────────────────

export default function AdminLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [conteoEnvios, setConteoEnvios] = useState<number | null>(null)
  const location = useLocation()

  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

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

  // Conteo de envíos activos para la insignia en la nav
  useEffect(() => {
    supabase
      .from('envios')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .then(({ count }) => setConteoEnvios(count))
  }, [])

  return (
    <div className="fixed inset-0 flex bg-canvas">
      {/* Sidebar — escritorio */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Link to="/admin" aria-label="Nexpak — ir al panel">
            <Logo variante="horizontal" tono="blanco" alto={28} alt="" />
          </Link>
        </div>
        <SidebarBody conteoEnvios={conteoEnvios} />
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Logo variante="horizontal" tono="blanco" alto={24} />
          <button
            onClick={() => setMenuAbierto(false)}
            className="text-white/60 hover:text-white transition-colors cursor-pointer p-1 -mr-1"
            aria-label="Cerrar menú"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <SidebarBody conteoEnvios={conteoEnvios} />
      </aside>

      {/* Área de contenido */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra superior — escritorio */}
        <header className="hidden lg:flex items-center gap-4 px-8 py-3.5 bg-surface border-b border-[#DDE3EC] flex-shrink-0">
          <BuscadorGlobal />
          <Link
            to="/admin/envios/nuevo"
            className="flex-none flex items-center gap-2 min-h-11 px-5 rounded-[10px] bg-[#C2410C] text-white font-semibold text-sm hover:bg-accent transition-colors whitespace-nowrap"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.envios.nuevo}
          </Link>
        </header>

        {/* Barra superior — móvil */}
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
