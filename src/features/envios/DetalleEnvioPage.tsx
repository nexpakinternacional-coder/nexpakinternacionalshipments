import { useParams } from 'react-router-dom'

export default function DetalleEnvioPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Detalle del envío</h1>
      <p className="text-gray-500">Envío <strong>{id}</strong> — próximamente</p>
    </main>
  )
}
