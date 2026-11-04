import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { t } from '../../textos/es'
import Logo from '../../components/Logo'

export default function NotFoundPage() {
  const error = useRouteError()
  const es404 =
    !error ||
    (isRouteErrorResponse(error) && error.status === 404)

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/" aria-label="Ir al inicio de Nexpak">
            <Logo variante="isotipo" tono="color" alto={36} alt="" />
          </Link>
        </div>
        <p className="text-8xl font-semibold text-navy/15 font-mono select-none mb-4">
          404
        </p>
        <h1 className="text-xl font-semibold text-ink mb-2">
          {es404 ? t.pagina404.titulo : 'Algo salió mal'}
        </h1>
        <p className="text-ink-muted text-sm mb-8">
          {es404
            ? t.pagina404.mensaje
            : 'Ocurrió un error inesperado. Intenta de nuevo.'}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/"
            className="px-4 py-2.5 border border-border rounded-lg text-sm text-ink hover:bg-surface transition-colors cursor-pointer"
          >
            {t.pagina404.botonInicio}
          </Link>
          <Link
            to="/"
            className="px-4 py-2.5 bg-navy text-white rounded-lg text-sm hover:bg-navy/90 transition-colors cursor-pointer"
          >
            {t.pagina404.botonRastrear}
          </Link>
        </div>
      </div>
    </main>
  )
}
