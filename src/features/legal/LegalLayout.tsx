import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import Logo from '../../components/Logo'

export function BannerRevision() {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-[800px] mx-auto px-6 py-3 flex items-center gap-2.5 text-amber-800 text-sm">
        <AlertTriangle size={16} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
        <span>Documento en revisión legal. El contenido puede cambiar antes de la publicación oficial.</span>
      </div>
    </div>
  )
}

export function LegalLayout({
  titulo,
  subtitulo,
  actualizado,
  children,
}: {
  titulo: string
  subtitulo?: string
  actualizado: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <BannerRevision />

      {/* Encabezado */}
      <header className="bg-navy border-b border-white/8">
        <div className="max-w-[1240px] mx-auto px-6 flex items-center gap-4" style={{ minHeight: '64px' }}>
          <Link to="/" aria-label="Inicio" className="flex-shrink-0">
            <Logo variante="horizontal" tono="blanco" alto={28} alt="Nexpak" />
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-[800px] mx-auto px-6 py-12 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors w-fit"
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            Volver al inicio
          </Link>
          <h1 className="m-0 font-display font-extrabold text-navy leading-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>
            {titulo}
          </h1>
          {subtitulo && (
            <p className="m-0 text-ink-muted text-base">{subtitulo}</p>
          )}
          <p className="m-0 text-sm text-ink-muted">Última actualización: {actualizado}</p>
        </div>

        <div className="prose-legal">
          {children}
        </div>
      </main>

      {/* Pie mínimo */}
      <footer className="bg-navy-deep text-[#C9D3E3]">
        <div className="max-w-[800px] mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-sm">
          <span>© {new Date().getFullYear()} Nexpak</span>
          <nav className="flex gap-5" aria-label="Legal">
            <Link to="/privacidad" className="text-[#C9D3E3] hover:text-white transition-colors">Política de datos</Link>
            <Link to="/aviso-privacidad" className="text-[#C9D3E3] hover:text-white transition-colors">Aviso de privacidad</Link>
            <Link to="/terminos" className="text-[#C9D3E3] hover:text-white transition-colors">Términos</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
