import { useParams } from 'react-router-dom'

export default function RastreoPage() {
  const { guia } = useParams<{ guia: string }>()
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <p className="text-gray-500">Detalle del envío <strong>{guia}</strong> — próximamente</p>
    </main>
  )
}
