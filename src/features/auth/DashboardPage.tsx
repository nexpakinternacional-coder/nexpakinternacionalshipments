import { t } from '../../textos/es'

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-ink mb-1">{t.dashboard.titulo}</h1>
      <p className="text-ink-muted text-sm">
        El resumen de operaciones estará disponible próximamente.
      </p>
    </div>
  )
}
