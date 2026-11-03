import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type Tables } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { formatearGuia } from '../../lib/guia'
import { formatearFechaHora, formatearSoloFecha } from '../../lib/formato'
import { ESTADOS } from '../../lib/estados'
import BadgeEstado from '../../components/BadgeEstado'
import { Skeleton } from '../../components/Skeleton'
import EnvioForm from './EnvioForm'
import { type EnvioFormData } from './schema'
import { t } from '../../textos/es'

type Envio = Tables<'envios'>
type Evento = Tables<'eventos_envio'>

function TarjetaInfo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h2 className="text-xs font-semibold text-navy uppercase tracking-wide mb-4">{titulo}</h2>
      <dl className="space-y-3">{children}</dl>
    </div>
  )
}

function Campo({ label, value }: { label: string; value?: string | number | null }) {
  const texto = value != null && value !== '' ? String(value) : t.comun.noAplica
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink mt-0.5">{texto}</dd>
    </div>
  )
}

function SkeletonDetalle() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DetalleEnvioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { perfil } = useAuth()

  const [envio, setEnvio] = useState<Envio | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [cargando, setCargando] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [editando, setEditando] = useState(false)

  const [eliminando, setEliminando] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [errorEliminar, setErrorEliminar] = useState('')

  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(async () => {
    if (!id) return
    setCargando(true)

    const [{ data: envioData, error: errEnvio }, { data: eventosData }] = await Promise.all([
      supabase.from('envios').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('eventos_envio')
        .select('*')
        .eq('envio_id', id)
        .order('ocurrido_en', { ascending: false }),
    ])

    if (errEnvio || !envioData) {
      setNoEncontrado(true)
    } else {
      setEnvio(envioData)
      setEventos(eventosData ?? [])
    }
    setCargando(false)
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function copiarGuia() {
    if (!envio) return
    await navigator.clipboard.writeText(formatearGuia(envio.guia))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function handleActualizar(data: EnvioFormData) {
    if (!id) return
    const { error } = await supabase
      .from('envios')
      .update({
        ...data,
        remitente_telefono: data.remitente_telefono || null,
        remitente_email: data.remitente_email || null,
        remitente_direccion: data.remitente_direccion || null,
        destinatario_email: data.destinatario_email || null,
        destinatario_documento: data.destinatario_documento || null,
        fecha_estimada_entrega: data.fecha_estimada_entrega || null,
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await cargar()
    setEditando(false)
  }

  async function handleEliminar() {
    if (!id) return
    setErrorEliminar('')
    const { error } = await supabase.from('envios').delete().eq('id', id)
    if (error) {
      setErrorEliminar(error.message)
      return
    }
    navigate('/admin/envios')
  }

  if (cargando) return <SkeletonDetalle />

  if (noEncontrado) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/admin/envios"
            className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
            aria-label="Volver al listado"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-ink">{t.envios.detalleNoEncontrado}</h1>
        </div>
        <Link
          to="/admin/envios"
          className="text-sm text-accent-strong hover:underline cursor-pointer"
        >
          {t.envios.detalleVolver}
        </Link>
      </div>
    )
  }

  if (!envio) return null

  const guiaFormateada = formatearGuia(envio.guia)
  const esAdmin = perfil?.rol === 'admin'

  const defaultValuesEdicion: Partial<EnvioFormData> = {
    remitente_nombre: envio.remitente_nombre,
    remitente_telefono: envio.remitente_telefono ?? '',
    remitente_email: envio.remitente_email ?? '',
    remitente_direccion: envio.remitente_direccion ?? '',
    remitente_pais: envio.remitente_pais,
    remitente_ciudad: envio.remitente_ciudad,

    destinatario_nombre: envio.destinatario_nombre,
    destinatario_telefono: envio.destinatario_telefono ?? '',
    destinatario_email: envio.destinatario_email ?? '',
    destinatario_documento: envio.destinatario_documento ?? '',
    destinatario_direccion: envio.destinatario_direccion ?? '',
    destinatario_pais: envio.destinatario_pais,
    destinatario_ciudad: envio.destinatario_ciudad,

    descripcion_contenido: envio.descripcion_contenido ?? '',
    peso_kg: envio.peso_kg ?? undefined,
    largo_cm: envio.largo_cm ?? undefined,
    ancho_cm: envio.ancho_cm ?? undefined,
    alto_cm: envio.alto_cm ?? undefined,
    valor_declarado: envio.valor_declarado ?? undefined,
    moneda: envio.moneda,
    tipo_servicio: envio.tipo_servicio,
    fecha_estimada_entrega: envio.fecha_estimada_entrega ?? '',
  }

  if (editando) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setEditando(false)}
            className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
            aria-label="Volver al detalle"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-ink">{t.envios.formulario.tituloEditar}</h1>
        </div>
        <EnvioForm
          defaultValues={defaultValuesEdicion}
          onGuardar={handleActualizar}
          textoBoton={t.envios.formulario.botonGuardarCambios}
          textoCargando={t.envios.formulario.cargandoEdicion}
          onCancelar={() => setEditando(false)}
          storageKey={`borrador-edicion-${id}`}
        />
      </div>
    )
  }

  const puedeEliminar =
    confirmInput.toUpperCase().replace(/-/g, '').trim() === envio.guia

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/envios"
          className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
          aria-label="Volver al listado"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-ink">Detalle del envío</h1>
      </div>

      {/* Header card */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-2xl font-semibold text-navy tracking-wider">
                {guiaFormateada}
              </span>
              <button
                onClick={copiarGuia}
                aria-label={copiado ? t.comun.copiado : t.comun.copiar}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  copiado
                    ? 'bg-green-100 text-green-600'
                    : 'text-ink-muted hover:text-ink hover:bg-border'
                }`}
              >
                {copiado ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} />}
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <BadgeEstado estado={envio.estado_actual} />
              <span className="text-xs text-ink-muted">
                Creado el {formatearFechaHora(envio.created_at)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditando(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-ink hover:bg-canvas transition-colors cursor-pointer"
            >
              <Pencil size={14} strokeWidth={2} />
              {t.comun.editar}
            </button>
            {esAdmin && (
              <button
                onClick={() => setEliminando(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={14} strokeWidth={2} />
                {t.comun.eliminar}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <TarjetaInfo titulo={t.envios.detalleRemitente}>
          <Campo label={t.envios.formulario.nombre} value={envio.remitente_nombre} />
          <Campo
            label={t.envios.formulario.pais + ' / ' + t.envios.formulario.ciudad}
            value={`${envio.remitente_pais} / ${envio.remitente_ciudad}`}
          />
          <Campo label={t.envios.formulario.telefono} value={envio.remitente_telefono} />
          <Campo label={t.envios.formulario.email} value={envio.remitente_email} />
          <Campo label={t.envios.formulario.direccion} value={envio.remitente_direccion} />
        </TarjetaInfo>

        <TarjetaInfo titulo={t.envios.detalleDestinatario}>
          <Campo label={t.envios.formulario.nombre} value={envio.destinatario_nombre} />
          <Campo
            label={t.envios.formulario.pais + ' / ' + t.envios.formulario.ciudad}
            value={`${envio.destinatario_pais} / ${envio.destinatario_ciudad}`}
          />
          <Campo label={t.envios.formulario.telefono} value={envio.destinatario_telefono} />
          <Campo label={t.envios.formulario.email} value={envio.destinatario_email} />
          <Campo label={t.envios.formulario.documento} value={envio.destinatario_documento} />
          <Campo label={t.envios.formulario.direccion} value={envio.destinatario_direccion} />
        </TarjetaInfo>

        <TarjetaInfo titulo={t.envios.detallePaquete}>
          <Campo label={t.envios.formulario.descripcion} value={envio.descripcion_contenido} />
          <Campo
            label={t.envios.formulario.peso}
            value={envio.peso_kg != null ? `${envio.peso_kg} kg` : null}
          />
          {envio.largo_cm && envio.ancho_cm && envio.alto_cm && (
            <Campo
              label="Dimensiones"
              value={`${envio.largo_cm} × ${envio.ancho_cm} × ${envio.alto_cm} cm`}
            />
          )}
          <Campo
            label={t.envios.formulario.valorDeclarado}
            value={
              envio.valor_declarado != null
                ? `${envio.valor_declarado} ${envio.moneda}`
                : null
            }
          />
        </TarjetaInfo>

        <TarjetaInfo titulo={t.envios.detalleServicio}>
          <Campo
            label={t.envios.formulario.tipoServicio}
            value={envio.tipo_servicio === 'estandar' ? 'Estándar' : 'Express'}
          />
          <Campo
            label={t.envios.formulario.fechaEstimada}
            value={
              envio.fecha_estimada_entrega
                ? formatearSoloFecha(envio.fecha_estimada_entrega)
                : null
            }
          />
          <div>
            <dt className="text-xs text-ink-muted mb-1.5">{t.rastreo.estadoActual}</dt>
            <dd>
              <BadgeEstado estado={envio.estado_actual} />
            </dd>
          </div>
        </TarjetaInfo>
      </div>

      {/* Timeline */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-xs font-semibold text-navy uppercase tracking-wide mb-5">
          {t.envios.detalleHistorial}
        </h2>

        {eventos.length === 0 ? (
          <p className="text-sm text-ink-muted">{t.comun.cargando}</p>
        ) : (
          <div className="space-y-0">
            {eventos.map((ev, idx) => {
              const info = ESTADOS[ev.estado]
              return (
                <div key={ev.id} className="flex gap-4">
                  {/* Indicator column */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-surface ${info.colorFondo}`}
                    />
                    {idx < eventos.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`min-w-0 flex-1 ${idx < eventos.length - 1 ? 'pb-5' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <BadgeEstado estado={ev.estado} size="sm" />
                      <span className="text-xs text-ink-muted">
                        {formatearFechaHora(ev.ocurrido_en)}
                      </span>
                    </div>
                    {ev.ubicacion && (
                      <p className="text-sm text-ink mt-1">{ev.ubicacion}</p>
                    )}
                    {ev.nota_publica && (
                      <p className="text-sm text-ink-muted mt-1">{ev.nota_publica}</p>
                    )}
                    {ev.nota_interna && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">
                          {t.envios.detalleNotaInterna}
                        </p>
                        <p className="text-xs text-amber-700">{ev.nota_interna}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {eliminando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-md p-6"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <h2 className="text-base font-semibold text-ink mb-2">{t.envios.eliminarTitulo}</h2>
            <p className="text-sm text-ink-muted mb-4">{t.envios.eliminarAdvertencia}</p>

            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-center">
              <span className="font-mono font-semibold text-red-700">{guiaFormateada}</span>
            </div>

            <label className="block text-sm font-semibold text-ink mb-1.5">
              {t.envios.eliminarConfirmarLabel}
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder={guiaFormateada}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400"
              autoFocus
            />

            {errorEliminar && (
              <p className="text-xs text-red-600 mb-3">{errorEliminar}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleEliminar}
                disabled={!puedeEliminar}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {t.envios.eliminarConfirmarBoton}
              </button>
              <button
                onClick={() => {
                  setEliminando(false)
                  setConfirmInput('')
                  setErrorEliminar('')
                }}
                className="flex-1 py-2.5 border border-border text-ink text-sm rounded-lg hover:bg-canvas cursor-pointer transition-colors"
              >
                {t.comun.cancelar}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
