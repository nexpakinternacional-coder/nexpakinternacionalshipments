import Logo from '../../components/Logo'

const FONDOS = [
  { nombre: 'Blanco', bg: 'bg-white', text: 'text-ink' },
  { nombre: 'Azul marino', bg: 'bg-navy', text: 'text-white' },
  { nombre: 'Negro', bg: 'bg-black', text: 'text-white' },
]

const VARIANTES: Array<{ variante: 'horizontal' | 'isotipo'; tono: 'color' | 'blanco' | 'negro'; label: string }> = [
  { variante: 'horizontal', tono: 'color',  label: 'Horizontal · Color' },
  { variante: 'horizontal', tono: 'blanco', label: 'Horizontal · Blanco' },
  { variante: 'horizontal', tono: 'negro',  label: 'Horizontal · Negro' },
  { variante: 'isotipo',    tono: 'color',  label: 'Isotipo · Color' },
  { variante: 'isotipo',    tono: 'blanco', label: 'Isotipo · Blanco' },
  { variante: 'isotipo',    tono: 'negro',  label: 'Isotipo · Negro' },
]

const TAMANIOS_FAVICON = [16, 32, 64, 128]

export default function MarcaPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-14">
      <h1 className="text-2xl font-semibold text-ink">Hoja de marca · Nexpak</h1>

      {/* Variantes del logo sobre los tres fondos */}
      {FONDOS.map(({ nombre, bg, text }) => (
        <section key={nombre}>
          <h2 className={`text-sm font-semibold uppercase tracking-widest mb-4 ${text === 'text-ink' ? 'text-ink-muted' : 'text-ink-muted'}`}>
            Sobre fondo {nombre}
          </h2>
          <div className={`${bg} rounded-xl p-8 grid grid-cols-2 md:grid-cols-3 gap-8 items-center`}>
            {VARIANTES.map(({ variante, tono, label }) => (
              <div key={label} className="flex flex-col items-center gap-3">
                <Logo variante={variante} tono={tono} alto={40} />
                <span className={`text-xs ${text} opacity-50`}>{label}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Favicon a distintos tamaños */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted mb-4">
          Favicon
        </h2>
        <div className="flex gap-8 items-end flex-wrap">
          {TAMANIOS_FAVICON.map(px => (
            <div key={px} className="flex flex-col items-center gap-2">
              <img src="/favicon.svg" alt="favicon" width={px} height={px} />
              <span className="text-xs text-ink-muted">{px}px</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reglas de uso */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted mb-4">
          Reglas de uso
        </h2>
        <ul className="space-y-2 text-sm text-ink list-disc pl-5">
          <li>Espacio libre alrededor del logo igual a la altura de la tapa naranja.</li>
          <li>Tamaño mínimo: 24 px de alto para el logo horizontal; 16 px para el isotipo.</li>
          <li>Versión blanca sobre azul marino o fondos oscuros.</li>
          <li>Versión negra para impresión térmica.</li>
        </ul>
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <strong>No hacer:</strong> deformar, rotar, cambiar colores, agregar sombras o degradados, ni separar la tapa naranja de la N.
        </div>
      </section>
    </main>
  )
}
