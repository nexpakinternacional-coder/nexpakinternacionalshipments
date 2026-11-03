import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PAISES_FRECUENTES, TODOS_LOS_PAISES } from '../../lib/paises'
import { t } from '../../textos/es'

interface SelectorPaisProps {
  id: string
  label: string
  value: string
  onChange: (nombre: string) => void
  error?: string
  required?: boolean
}

export default function SelectorPais({
  id,
  label,
  value,
  onChange,
  error,
  required,
}: SelectorPaisProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function clickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', clickFuera)
    return () => document.removeEventListener('mousedown', clickFuera)
  }, [])

  useEffect(() => {
    if (abierto) setTimeout(() => searchRef.current?.focus(), 50)
  }, [abierto])

  const query = busqueda.toLowerCase()
  const frecuentes = query ? [] : PAISES_FRECUENTES
  const todos = TODOS_LOS_PAISES.filter(p => p.nombre.toLowerCase().includes(query))

  function seleccionar(nombre: string) {
    onChange(nombre)
    setAbierto(false)
    setBusqueda('')
  }

  const btnCls = `w-full px-3 py-2.5 border rounded-lg text-sm text-left flex items-center justify-between transition-colors cursor-pointer bg-surface ${
    error
      ? 'border-red-400 focus:ring-red-300/30'
      : 'border-border focus:ring-accent/20 focus:border-accent'
  } focus:outline-none focus:ring-2`

  const optCls = (nombre: string) =>
    `w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
      value === nombre
        ? 'text-accent-strong font-medium bg-orange-50'
        : 'text-ink hover:bg-canvas'
    }`

  return (
    <div ref={ref} className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-ink mb-1.5">
        {label}
        {required && (
          <span className="text-accent-strong ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <button
        type="button"
        id={id}
        onClick={() => setAbierto(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={btnCls}
      >
        <span className={value ? 'text-ink' : 'text-ink-muted/50'}>
          {value || t.envios.formulario.seleccionarPais}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-ink-muted flex-shrink-0 transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {abierto && (
        <div
          className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg overflow-hidden"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
          role="listbox"
        >
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              placeholder={t.envios.formulario.buscarPais}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {frecuentes.length > 0 && (
              <>
                <p className="px-3 py-1.5 text-xs font-semibold text-ink-muted bg-canvas">
                  {t.envios.formulario.paisesFrecuentes}
                </p>
                {frecuentes.map(p => (
                  <button key={p.codigo} type="button" onClick={() => seleccionar(p.nombre)} className={optCls(p.nombre)}>
                    {p.nombre}
                  </button>
                ))}
                <div className="border-t border-border" />
                <p className="px-3 py-1.5 text-xs font-semibold text-ink-muted bg-canvas">
                  {t.envios.formulario.todosLosPaises}
                </p>
              </>
            )}
            {todos.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink-muted text-center">
                {t.envios.formulario.sinResultadosPais}
              </p>
            ) : (
              todos.map(p => (
                <button key={p.codigo} type="button" onClick={() => seleccionar(p.nombre)} className={optCls(p.nombre)}>
                  {p.nombre}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
