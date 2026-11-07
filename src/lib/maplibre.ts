// Importaciones estáticas para que Vite resuelva las URLs en tiempo de build.
// El CSS se inyecta cuando este módulo se evalúa (peso ~10 KB, aceptable).
// El JS de MapLibre (~1 MB) se carga solo cuando se llama a cargarMapLibre().
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

let inicializado = false

export async function cargarMapLibre() {
  const ml = await import('maplibre-gl')
  if (!inicializado) {
    ml.setWorkerUrl(workerUrl)
    inicializado = true
  }
  return ml
}
