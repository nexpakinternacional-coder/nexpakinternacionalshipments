import MapaEnvio from '../../components/MapaEnvio'

// Ruta de diagnóstico — solo DEV (/dev/mapa)
// Tres escenarios: recorrido completo, solo origen, sin coordenadas
export default function MapaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-xl font-semibold text-navy">Prueba: MapaEnvio</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
          Recorrido completo (Houston → Detroit → Toronto)
        </h2>
        <MapaEnvio
          datos={{
            origen: { lat: 29.7604, lng: -95.3698, etiqueta: 'Houston, TX' },
            destino: { lat: 43.65, lng: -79.35, etiqueta: 'Toronto, ON' },
            eventos: [
              { lat: 29.7604, lng: -95.3698, etiqueta: 'Houston, TX' },
              { lat: 38.6270, lng: -90.1994, etiqueta: 'St. Louis, MO' },
              { lat: 42.3314, lng: -83.0458, etiqueta: 'Detroit, MI' },
            ],
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
          Solo origen (sin eventos ni destino)
        </h2>
        <MapaEnvio
          datos={{
            origen: { lat: 19.4326, lng: -99.1332, etiqueta: 'Ciudad de México' },
            eventos: [],
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
          Sin coordenadas (no debe renderizarse)
        </h2>
        <MapaEnvio datos={{ eventos: [] }} />
        <p className="text-xs text-ink-muted">↑ No debería aparecer nada aquí</p>
      </section>
    </div>
  )
}
