import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, MoreHorizontal, Pencil, RefreshCw } from 'lucide-react'
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
import PanelEstado from '../eventos/PanelEstado'
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
  const { perfil } = useAuth()

  const [envio, setEnvio] = useState<Envio | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [cargando, setCargando] = useState(true)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [editando, setEditando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Inactivar / reactivar
  const [inactivando, setInactivando] = useState(false)
  const [reactivando, setReactivando] = useState(false)
  const [motivoInactivar, setMotivoInactivar] = useState('')
  const [confirmInput, setConfirmInput] = useState('')
  const [errorInactivar, setErrorInactivar] = useState('')
  const [guardandoInactivar, setGuardandoInactivar] = useState(false)

  // Panel de estado
  const [mostrarPanelEstado, setMostrarPanelEstado] = useState(false)
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null)

  // Anular evento
  const [eventoAnulando, setEventoAnulando] = useState<Evento | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [errorAnular, setErrorAnular] = useState('')
  const [guardandoAnular, setGuardandoAnular] = useState(false)

  // ⋯ menu
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Perfiles y ediciones
  const [perfilesMap, setPerfilesMap] = useState<Record<string, string>>({})
  const [eventosEditados, setEventosEditados] = useState<Set<string>>(new Set())

  // Toast
  const [toastMsg, setToastMsg] = useState('')

  const esAdmin = perfil?.rol === 'admin'

  useEffect(() => {
    if (!menuAbiertoId) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbiertoId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuAbiertoId])

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
      setCargando(false)
      return
    }

    setEnvio(envioData)
    setEventos(eventosData ?? [])

    const allIds = [
      envioData.creado_por,
      envioData.inactivado_por,
      ...(eventosData ?? []).map(e => e.creado_por),
      ...(eventosData ?? []).map(e => e.anulado_por),
    ]
    const uniqueIds = [...new Set(allIds.filter((x): x is string => x !== null && x !== undefined))]
    if (uniqueIds.length > 0) {
      const { data: perfilesData } = await supabase
        .from('perfiles')
        .select('id, nombre')
        .in('id', uniqueIds)
      if (perfilesData) {
        const map: Record<string, string> = {}
        for (const p of perfilesData) map[p.id] = p.nombre
        setPerfilesMap(map)
      }
    }

    if (perfil?.rol === 'admin' && (eventosData ?? []).length > 0) {
      const { data: auds } = await supabase
        .from('auditoria')
        .select('registro_id')
        .eq('tabla', 'eventos_envio')
        .eq('accion', 'UPDATE')
        .in('registro_id', (eventosData ?? []).map(e => e.id))
      setEventosEditados(new Set(auds?.map(a => a.registro_id) ?? []))
    }

    setCargando(false)
  }, [id, perfil?.rol])

  useEffect(() => {
    cargar()
  }, [cargar])

  function mostrarToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

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

  async function handleInactivar() {
    if (!id) return
    setErrorInactivar('')
    setGuardandoInactivar(true)
    const { error } = await supabase.rpc('inactivar_envio', {
      p_envio_id: id,
      p_motivo: motivoInactivar.trim(),
    })
    if (error) {
      setErrorInactivar(error.message)
      setGuardandoInactivar(false)
      return
    }
    setInactivando(false)
    setMotivoInactivar('')
    setConfirmInput('')
    setGuardandoInactivar(false)
    await cargar()
  }

  async function handleReactivar() {
    if (!id) return
    const { error } = await supabase.rpc('reactivar_envio', { p_envio_id: id })
    if (error) return
    setReactivando(false)
    await cargar()
  }

  async function handleAnularEvento() {
    if (!eventoAnulando) return
    setErrorAnular('')
    setGuardandoAnular(true)
    const { error } = await supabase.rpc('anular_evento', {
      p_evento_id: eventoAnulando.id,
      p_motivo: motivoAnulacion.trim(),
    })
    if (error) {
      setErrorAnular(error.message)
      setGuardandoAnular(false)
      return
    }
    setEventoAnulando(null)
    setMotivoAnulacion('')
    setGuardandoAnular(false)
    await cargar()
  }

  async function onPanelGuardado() {
    const wasEditing = !!eventoEditando
    setMostrarPanelEstado(false)
    setEventoEditando(null)
    mostrarToast(wasEditing ? t.eventos.exitoEdicion : t.eventos.exito)
    await cargar()
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

  const camposIncompletos: string[] = []
  if (!envio.destinatario_telefono) camposIncompletos.push(t.envios.formulario.telefono + ' (destinatario)')
  if (!envio.destinatario_direccion) camposIncompletos.push(t.envios.formulario.direccion + ' (destinatario)')
  if (!envio.descripcion_contenido) camposIncompletos.push(t.envios.formulario.descripcion)
  if (!envio.peso_kg) camposIncompletos.push(t.envios.formulario.peso)

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

  const puedeInactivar =
    motivoInactivar.trim().length > 0 &&
    confirmInput.toUpperCase().replace(/-/g, '').trim() === envio.guia

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
          camposIncompletos={camposIncompletos}
        />
      </div>
    )
  }

  const nombreInactivador = envio.inactivado_por
    ? (perfilesMap[envio.inactivado_por] ?? '?')
    : '?'

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
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

      {/* Inactive banner */}
      {!envio.activo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-amber-800">
              {t.envios.bannnerInactivo(
                formatearFechaHora(envio.inactivado_en!),
                nombreInactivador,
                envio.motivo_inactivacion ?? '',
              )}
            </p>
            {esAdmin && (
              <button
                onClick={() => setReactivando(true)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer transition-colors"
              >
                <RefreshCw size={13} strokeWidth={2} />
                {t.envios.reactivarBoton}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Incomplete data warning */}
      {camposIncompletos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm text-amber-800">{t.envios.datosFaltantes(camposIncompletos)}</p>
        </div>
      )}

      {/* Header card */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-mono text-2xl font-semibold text-navy tracking-wider ${!envio.activo ? 'opacity-50' : ''}`}>
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
              {!envio.activo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                  {t.envios.etiquetaInactivo}
                </span>
              )}
              <span className="text-xs text-ink-muted">
                Creado el {formatearFechaHora(envio.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {envio.activo && (
              <button
                onClick={() => { setEventoEditando(null); setMostrarPanelEstado(true) }}
                className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors cursor-pointer"
              >
                {t.eventos.actualizarEstado}
              </button>
            )}
            <button
              onClick={() => setEditando(true)}
              disabled={!envio.activo}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Pencil size={14} strokeWidth={2} />
              {t.comun.editar}
            </button>
            {esAdmin && envio.activo && (
              <button
                onClick={() => setInactivando(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors cursor-pointer"
              >
                {t.envios.inactivarTitulo}
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
              const anuladorNombre = ev.anulado_por
                ? (perfilesMap[ev.anulado_por] ?? '?')
                : '?'
              const fueEditado = eventosEditados.has(ev.id)
              const esMenuVisible = !ev.anulado && (perfil?.rol === 'admin' || perfil?.rol === 'operador')
              const puedeAnular = esAdmin && ev.estado !== 'guia_generada' && !ev.anulado

              return (
                <div key={ev.id} className={`flex gap-4 ${ev.anulado ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-surface ${
                        ev.anulado ? 'bg-slate-300' : info.colorFondo
                      }`}
                    />
                    {idx < eventos.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>

                  <div className={`min-w-0 flex-1 ${idx < eventos.length - 1 ? 'pb-5' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={ev.anulado ? 'line-through' : ''}>
                          <BadgeEstado estado={ev.estado} size="sm" />
                        </span>
                        <span className="text-xs text-ink-muted">
                          {formatearFechaHora(ev.ocurrido_en)}
                        </span>
                        {fueEditado && !ev.anulado && (
                          <span className="text-xs text-ink-muted italic">
                            · {t.eventos.eventoEditado}
                          </span>
                        )}
                      </div>
                      {esMenuVisible && (
                        <div
                          className="relative flex-shrink-0"
                          ref={menuAbiertoId === ev.id ? menuRef : undefined}
                        >
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setMenuAbiertoId(menuAbiertoId === ev.id ? null : ev.id)
                            }}
                            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                            aria-label="Opciones"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {menuAbiertoId === ev.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-lg shadow-lg z-20 py-1">
                              {!ev.anulado && (
                                <button
                                  onClick={() => {
                                    setMenuAbiertoId(null)
                                    setEventoEditando(ev)
                                    setMostrarPanelEstado(true)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-ink text-left hover:bg-canvas cursor-pointer"
                                >
                                  {t.eventos.menuEditar}
                                </button>
                              )}
                              {puedeAnular && (
                                <button
                                  onClick={() => {
                                    setMenuAbiertoId(null)
                                    setEventoAnulando(ev)
                                  }}
                                  className="w-full px-3 py-2 text-sm text-red-600 text-left hover:bg-red-50 cursor-pointer"
                                >
                                  {t.eventos.menuAnular}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {ev.anulado && (
                      <p className="text-xs text-ink-muted mt-0.5 italic">
                        {t.eventos.eventoAnulado(anuladorNombre, ev.motivo_anulacion ?? '')}
                      </p>
                    )}
                    {!ev.anulado && ev.ubicacion && (
                      <p className="text-sm text-ink mt-1">{ev.ubicacion}</p>
                    )}
                    {!ev.anulado && ev.nota_publica && (
                      <p className="text-sm text-ink-muted mt-1">{ev.nota_publica}</p>
                    )}
                    {!ev.anulado && ev.nota_interna && (
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

      {/* Panel de estado */}
      {mostrarPanelEstado && (
        <PanelEstado
          envioId={envio.id}
          estadoActual={envio.estado_actual}
          eventoEditar={eventoEditando}
          onClose={() => {
            setMostrarPanelEstado(false)
            setEventoEditando(null)
          }}
          onGuardado={onPanelGuardado}
        />
      )}

      {/* Modal inactivar */}
      {inactivando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-md p-6"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <h2 className="text-base font-semibold text-ink mb-2">{t.envios.inactivarTitulo}</h2>
            <p className="text-sm text-ink-muted mb-4">{t.envios.inactivarAdvertencia}</p>

            <label className="block text-sm font-semibold text-ink mb-1.5">
              {t.envios.inactivarMotivoLabel}
            </label>
            <textarea
              value={motivoInactivar}
              onChange={e => setMotivoInactivar(e.target.value)}
              placeholder={t.envios.inactivarMotivoPlaceholder}
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400"
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-center">
              <span className="font-mono font-semibold text-amber-700">{guiaFormateada}</span>
            </div>

            <label className="block text-sm font-semibold text-ink mb-1.5">
              {t.envios.inactivarConfirmarLabel}
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder={guiaFormateada}
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400"
            />

            {errorInactivar && (
              <p className="text-xs text-red-600 mb-3">{errorInactivar}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleInactivar}
                disabled={!puedeInactivar || guardandoInactivar}
                className="flex-1 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {guardandoInactivar ? t.envios.inactivarCargando : t.envios.inactivarConfirmarBoton}
              </button>
              <button
                onClick={() => {
                  setInactivando(false)
                  setMotivoInactivar('')
                  setConfirmInput('')
                  setErrorInactivar('')
                }}
                disabled={guardandoInactivar}
                className="flex-1 py-2.5 border border-border text-ink text-sm rounded-lg hover:bg-canvas cursor-pointer transition-colors"
              >
                {t.comun.cancelar}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reactivar */}
      {reactivando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-sm p-6"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <h2 className="text-base font-semibold text-ink mb-2">{t.envios.reactivarTitulo}</h2>
            <p className="text-sm text-ink-muted mb-5">{t.envios.reactivarConfirmar}</p>
            <div className="flex gap-2">
              <button
                onClick={handleReactivar}
                className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 cursor-pointer transition-colors"
              >
                {t.envios.reactivarBoton}
              </button>
              <button
                onClick={() => setReactivando(false)}
                className="flex-1 py-2.5 border border-border text-ink text-sm rounded-lg hover:bg-canvas cursor-pointer transition-colors"
              >
                {t.comun.cancelar}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal anular evento */}
      {eventoAnulando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-md p-6"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
          >
            <h2 className="text-base font-semibold text-ink mb-2">{t.eventos.anularTitulo}</h2>
            <p className="text-sm text-ink-muted mb-4">{t.eventos.anularAdvertencia}</p>

            <label className="block text-sm font-semibold text-ink mb-1.5">
              {t.eventos.anularMotivoLabel}
            </label>
            <textarea
              value={motivoAnulacion}
              onChange={e => setMotivoAnulacion(e.target.value)}
              placeholder={t.eventos.anularMotivoPlaceholder}
              rows={3}
              autoFocus
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400"
            />

            {errorAnular && (
              <p className="text-xs text-red-600 mb-3">{errorAnular}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAnularEvento}
                disabled={!motivoAnulacion.trim() || guardandoAnular}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {guardandoAnular ? t.eventos.anularCargando : t.eventos.anularBoton}
              </button>
              <button
                onClick={() => {
                  setEventoAnulando(null)
                  setMotivoAnulacion('')
                  setErrorAnular('')
                }}
                disabled={guardandoAnular}
                className="flex-1 py-2.5 border border-border text-ink text-sm rounded-lg hover:bg-canvas cursor-pointer transition-colors"
              >
                {t.comun.cancelar}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm font-medium px-5 py-3 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}
