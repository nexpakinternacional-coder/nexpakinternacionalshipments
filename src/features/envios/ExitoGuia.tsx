import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Copy, Check } from 'lucide-react'
import { formatearGuia } from '../../lib/guia'
import { t } from '../../textos/es'

interface ExitoGuiaProps {
  guia: string
  envioId: string
  onCrearOtro: () => void
}

export default function ExitoGuia({ guia, envioId, onCrearOtro }: ExitoGuiaProps) {
  const [copiado, setCopiado] = useState(false)
  const guiaFormateada = formatearGuia(guia)

  async function copiar() {
    await navigator.clipboard.writeText(guiaFormateada)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div
          className="bg-surface border border-border rounded-xl p-8 text-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-green-600" strokeWidth={2} />
          </div>

          <h1 className="text-xl font-semibold text-ink mb-1">
            {t.envios.exitoTitulo}
          </h1>
          <p className="text-ink-muted text-sm mb-6">
            {t.envios.exitoSubtitulo}
          </p>

          {/* Guía */}
          <div className="bg-canvas border border-border rounded-lg px-6 py-4 mb-6">
            <p className="text-xs text-ink-muted mb-2 font-medium">
              Número de guía
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl font-semibold text-navy tracking-wider">
                {guiaFormateada}
              </span>
              <button
                onClick={copiar}
                aria-label={copiado ? t.envios.exitoCopiado : t.envios.exitoCopiar}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  copiado
                    ? 'bg-green-100 text-green-600'
                    : 'text-ink-muted hover:text-ink hover:bg-border'
                }`}
              >
                {copiado ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <Link
              to={`/admin/envios/${envioId}`}
              className="w-full py-2.5 bg-navy text-white font-semibold rounded-lg text-sm hover:bg-navy/90 transition-colors cursor-pointer text-center"
            >
              {t.envios.exitoVerEnvio}
            </Link>
            <button
              onClick={onCrearOtro}
              className="w-full py-2.5 border border-border text-ink rounded-lg text-sm hover:bg-canvas transition-colors cursor-pointer"
            >
              {t.envios.exitoCrearOtro}
            </button>
            <Link
              to="/admin/envios"
              className="w-full py-2.5 text-ink-muted rounded-lg text-sm hover:text-ink transition-colors cursor-pointer text-center"
            >
              {t.envios.exitoIrListado}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
