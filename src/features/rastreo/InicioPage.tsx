import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BellRing, Globe2, Search } from 'lucide-react'
import { normalizarGuia, validarGuia } from '../../lib/guia'
import { t } from '../../textos/es'
import Logo from '../../components/Logo'

function formatarInputGuia(raw: string): string {
  const limpio = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
  if (limpio.length <= 3) return limpio
  return `${limpio.slice(0, 3)}-${limpio.slice(3)}`
}

const PASOS = [
  {
    icono: Search,
    titulo: t.rastreo.paso1Titulo,
    desc: t.rastreo.paso1Desc,
  },
  {
    icono: Globe2,
    titulo: t.rastreo.paso2Titulo,
    desc: t.rastreo.paso2Desc,
  },
  {
    icono: BellRing,
    titulo: t.rastreo.paso3Titulo,
    desc: t.rastreo.paso3Desc,
  },
]

export default function InicioPage() {
  const navigate = useNavigate()
  const [inputGuia, setInputGuia] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = t.rastreo.seoTituloInicio
    let metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', t.rastreo.seoDescInicio)
    // Remove noindex if coming from rastreo page
    document.querySelector('meta[name="robots"]')?.remove()
    inputRef.current?.focus()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formateado = formatarInputGuia(e.target.value)
    setInputGuia(formateado)
    setError('')
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    const normalizada = normalizarGuia(inputGuia)
    if (!normalizada) {
      setError(t.rastreo.guiaInvalida)
      return
    }
    if (!validarGuia(normalizada)) {
      setError(t.rastreo.guiaInvalida)
      return
    }
    navigate(`/rastreo/${normalizada}`)
  }

  return (
    <>
      {/* Cabecera */}
      <header className="px-6 pt-8 pb-0">
        <div className="max-w-2xl mx-auto">
          <Logo variante="horizontal" tono="color" alto={32} />
        </div>
      </header>

      {/* Hero + buscador */}
      <main className="max-w-2xl mx-auto px-6">
        <section className="py-14 md:py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-navy mb-3 leading-tight">
            {t.rastreo.titulo}
          </h1>
          <p className="text-ink-muted text-base md:text-lg mb-10 max-w-md mx-auto">
            {t.rastreo.descripcion}
          </p>

          <form onSubmit={handleBuscar} noValidate>
            {/* En móvil: columna con ancho máximo compartido (mismo ancho input y botón).
                En sm+: fila flexible. */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-sm mx-auto sm:max-w-none">
              <div className="relative sm:flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  value={inputGuia}
                  onChange={handleChange}
                  placeholder={t.rastreo.placeholder}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Número de guía"
                  aria-describedby={error ? 'guia-error' : undefined}
                  aria-invalid={!!error}
                  className={`w-full font-mono text-lg text-center px-4 py-3.5 border-2 rounded-xl bg-surface transition-colors focus:outline-none focus:ring-0 tracking-widest placeholder:text-ink-muted/50 placeholder:tracking-normal ${
                    error
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-border focus:border-navy'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-accent-strong text-white font-semibold rounded-xl hover:bg-accent transition-colors cursor-pointer whitespace-nowrap"
              >
                {t.rastreo.botonRastrear}
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
            {error && (
              <p id="guia-error" role="alert" className="mt-3 text-sm text-red-600 text-center">
                {error}
              </p>
            )}
          </form>
        </section>

        {/* ¿Cómo funciona? */}
        <section className="pb-16">
          <h2 className="text-center text-xs font-semibold text-ink-muted uppercase tracking-widest mb-8">
            {t.rastreo.comoFuncionaTitulo}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PASOS.map((paso, i) => (
              <div key={i} className="text-center px-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy/8 mb-4">
                  <paso.icono size={22} strokeWidth={1.75} className="text-navy" />
                </div>
                <h3 className="font-semibold text-ink mb-1 text-sm">{paso.titulo}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{paso.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Pie de página */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <span className="font-semibold text-navy">{t.app.nombre}</span>
          <span className="text-center">
            {t.pie.direccion} · {t.pie.telefono} · {t.pie.correo}
          </span>
          <span>{t.pie.derechos(new Date().getFullYear())}</span>
        </div>
      </footer>
    </>
  )
}
