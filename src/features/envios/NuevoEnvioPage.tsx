import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import EnvioForm from './EnvioForm'
import ExitoGuia from './ExitoGuia'
import { type EnvioFormData } from './schema'
import { t } from '../../textos/es'

export default function NuevoEnvioPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [exito, setExito] = useState<{ guia: string; id: string } | null>(null)

  async function handleGuardar(data: EnvioFormData) {
    const { origen_coords, destino_coords, remitente_estado, destinatario_estado, ...resto } = data
    const { data: envio, error } = await supabase
      .from('envios')
      .insert({
        ...resto,
        remitente_telefono: data.remitente_telefono || null,
        remitente_email: data.remitente_email || null,
        remitente_direccion: data.remitente_direccion || null,
        remitente_estado: remitente_estado || null,
        destinatario_email: data.destinatario_email || null,
        destinatario_documento: data.destinatario_documento || null,
        destinatario_estado: destinatario_estado || null,
        fecha_estimada_entrega: data.fecha_estimada_entrega || null,
        origen_lat: origen_coords?.lat ?? null,
        origen_lng: origen_coords?.lng ?? null,
        destino_lat: destino_coords?.lat ?? null,
        destino_lng: destino_coords?.lng ?? null,
        creado_por: session?.user.id,
      })
      .select('id, guia')
      .single()

    if (error) throw new Error(error.message)
    setExito({ guia: envio.guia, id: envio.id })
  }

  if (exito) {
    return (
      <ExitoGuia
        guia={exito.guia}
        envioId={exito.id}
        onCrearOtro={() => setExito(null)}
      />
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/envios"
          className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
          aria-label="Volver al listado"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-ink">
          {t.envios.formulario.tituloNuevo}
        </h1>
      </div>

      <EnvioForm
        onGuardar={handleGuardar}
        storageKey="borrador-nuevo-envio"
        onCancelar={() => navigate('/admin/envios')}
      />
    </div>
  )
}
