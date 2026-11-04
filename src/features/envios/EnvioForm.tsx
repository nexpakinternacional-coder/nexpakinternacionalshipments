import { useEffect, useRef, useState } from 'react'
import { type Resolver, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { envioSchema, type EnvioFormData } from './schema'
import SelectorPais from './SelectorPais'
import SelectorUbicacion from '../../components/SelectorUbicacion'
import { t } from '../../textos/es'
import { MapPin } from 'lucide-react'

interface EnvioFormProps {
  defaultValues?: Partial<EnvioFormData>
  onGuardar: (data: EnvioFormData) => Promise<void>
  textoBoton?: string
  textoCargando?: string
  onCancelar?: () => void
  storageKey?: string
  /** Lista de campos vacíos que deberían tener valor (para avisar al usuario). */
  camposIncompletos?: string[]
}

function leerBorrador(key: string): Partial<EnvioFormData> | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<EnvioFormData>) : null
  } catch {
    return null
  }
}

function borrarBorrador(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignorar
  }
}

/** Verifica si dos objetos de valores de formulario son equivalentes (para comparar borrador vs datos guardados). */
function valoresSonIguales(
  a: Partial<EnvioFormData>,
  b: Partial<EnvioFormData>,
): boolean {
  const keysA = Object.keys(a) as (keyof EnvioFormData)[]
  return keysA.every(k => {
    const va = a[k] ?? ''
    const vb = b[k] ?? ''
    return String(va) === String(vb)
  })
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm text-ink bg-surface placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 transition-colors ${
    err
      ? 'border-red-400 focus:ring-red-300/30'
      : 'border-border focus:ring-accent/20 focus:border-accent'
  }`

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-navy uppercase tracking-wide mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  error,
  required,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink mb-1.5">
        {label}
        {required && (
          <span className="text-accent-strong ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Selector de mapa colapsable para origen/destino del envío
function MapaOpcional({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: { lat: number; lng: number; etiqueta: string } | null | undefined
  onChange: (v: { lat: number; lng: number; etiqueta: string } | null) => void
}) {
  const [abierto, setAbierto] = useState(!!valor)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-navy font-medium hover:bg-canvas transition-colors cursor-pointer"
      >
        <MapPin size={15} strokeWidth={1.75} className="flex-shrink-0" />
        {label}
        {valor && (
          <span className="ml-auto text-xs text-ink-muted font-normal truncate max-w-[180px]">
            {valor.etiqueta}
          </span>
        )}
        <span className="ml-auto text-ink-muted text-xs">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="p-3 border-t border-border bg-canvas">
          <SelectorUbicacion
            valor={valor ?? null}
            onChange={onChange}
            label={label}
          />
        </div>
      )}
    </div>
  )
}

const BASE_DEFAULTS: Partial<EnvioFormData> = {
  moneda: 'USD',
  tipo_servicio: 'estandar',
  remitente_pais: '',
  destinatario_pais: '',
}

export default function EnvioForm({
  defaultValues,
  onGuardar,
  textoBoton = t.envios.formulario.botonGuardar,
  textoCargando = t.envios.formulario.cargando,
  onCancelar,
  storageKey,
  camposIncompletos,
}: EnvioFormProps) {
  // true = hay datos guardados (modo edición)
  const esEdicion = !!(defaultValues && Object.keys(defaultValues).length > 0)

  // En modo edición: inicializa con los datos de BD, nunca con el borrador
  // En modo creación: aplica el borrador sobre los defaultValues
  const borradorInicial = !esEdicion && storageKey ? leerBorrador(storageKey) : null
  const valorInicial: Partial<EnvioFormData> = {
    ...BASE_DEFAULTS,
    ...defaultValues,
    ...(borradorInicial ?? {}),
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<EnvioFormData>({
    resolver: zodResolver(envioSchema) as unknown as Resolver<EnvioFormData>,
    defaultValues: valorInicial,
  })

  // En modo edición: sincroniza si llegan nuevos defaultValues (después de cargar de BD)
  const prevDefaultValuesRef = useRef(defaultValues)
  useEffect(() => {
    if (!esEdicion) return
    if (prevDefaultValuesRef.current === defaultValues) return
    prevDefaultValuesRef.current = defaultValues
    reset({ ...BASE_DEFAULTS, ...defaultValues })
  }, [defaultValues, esEdicion, reset])

  // Banner "borrador disponible" — solo en modo edición, si hay borrador con cambios reales
  const [ofrecerBorrador, setOfrecerBorrador] = useState(false)
  useEffect(() => {
    if (!storageKey || !esEdicion) return
    const draft = leerBorrador(storageKey)
    if (!draft) return
    // Ignorar si el borrador es vacío o igual a los datos guardados
    if (valoresSonIguales(draft, { ...BASE_DEFAULTS, ...defaultValues })) {
      borrarBorrador(storageKey)
    } else {
      setOfrecerBorrador(true)
    }
    // Solo en mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persiste el borrador en sessionStorage en cada cambio
  useEffect(() => {
    if (!storageKey) return
    const { unsubscribe } = watch(values => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(values))
      } catch {
        // ignorar (ej. modo privado)
      }
    })
    return unsubscribe
  }, [storageKey, watch])

  async function onSubmit(data: EnvioFormData) {
    try {
      await onGuardar(data)
      if (storageKey) borrarBorrador(storageKey)
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : t.envios.formulario.error,
      })
    }
  }

  function handleCancelar() {
    if (storageKey) borrarBorrador(storageKey)
    onCancelar?.()
  }

  function restaurarBorrador() {
    const draft = storageKey ? leerBorrador(storageKey) : null
    if (draft) reset({ ...BASE_DEFAULTS, ...defaultValues, ...draft })
    setOfrecerBorrador(false)
  }

  function descartarBorrador() {
    if (storageKey) borrarBorrador(storageKey)
    setOfrecerBorrador(false)
  }

  const f = t.envios.formulario

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* ── Aviso: datos incompletos ──────────────────────── */}
      {camposIncompletos && camposIncompletos.length > 0 && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
          <p className="text-sm text-amber-800">
            {t.envios.datosFaltantes(camposIncompletos)}
          </p>
        </div>
      )}

      {/* ── Aviso: borrador disponible ────────────────────── */}
      {ofrecerBorrador && (
        <div role="alert" className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-blue-800">{t.envios.borradorDisponible}</p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={restaurarBorrador}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer underline"
            >
              {t.envios.borradorRestaurar}
            </button>
            <button
              type="button"
              onClick={descartarBorrador}
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              {t.envios.borradorDescartar}
            </button>
          </div>
        </div>
      )}

      {/* ── Remitente ─────────────────────────────────── */}
      <Section title={f.seccionRemitente}>
        <Field id="remitente_nombre" label={f.nombre} error={errors.remitente_nombre?.message} required className="md:col-span-2">
          <input id="remitente_nombre" {...register('remitente_nombre')} className={inputCls(errors.remitente_nombre?.message)} />
        </Field>

        <Controller name="remitente_pais" control={control} render={({ field, fieldState }) => (
          <SelectorPais id="remitente_pais" label={f.pais} value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
        )} />

        <Field id="remitente_ciudad" label={f.ciudad} error={errors.remitente_ciudad?.message} required>
          <input id="remitente_ciudad" {...register('remitente_ciudad')} className={inputCls(errors.remitente_ciudad?.message)} />
        </Field>

        <Field id="remitente_estado" label={f.estado} error={errors.remitente_estado?.message}>
          <input id="remitente_estado" {...register('remitente_estado')} placeholder={f.estadoPlaceholder} className={inputCls(errors.remitente_estado?.message)} />
        </Field>

        <div className="md:col-span-2">
          <Controller
            name="origen_coords"
            control={control}
            render={({ field }) => (
              <MapaOpcional
                label="Ubicar origen en el mapa"
                valor={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <Field id="remitente_telefono" label={f.telefono} error={errors.remitente_telefono?.message}>
          <input id="remitente_telefono" type="tel" {...register('remitente_telefono')} placeholder="+57 300 000 0000" className={inputCls(errors.remitente_telefono?.message)} />
        </Field>

        <Field id="remitente_email" label={f.email} error={errors.remitente_email?.message}>
          <input id="remitente_email" type="email" {...register('remitente_email')} className={inputCls(errors.remitente_email?.message)} />
        </Field>

        <Field id="remitente_direccion" label={f.direccion} error={errors.remitente_direccion?.message} className="md:col-span-2">
          <input id="remitente_direccion" {...register('remitente_direccion')} className={inputCls(errors.remitente_direccion?.message)} />
        </Field>
      </Section>

      {/* ── Destinatario ──────────────────────────────── */}
      <Section title={f.seccionDestinatario}>
        <Field id="destinatario_nombre" label={f.nombre} error={errors.destinatario_nombre?.message} required className="md:col-span-2">
          <input id="destinatario_nombre" {...register('destinatario_nombre')} className={inputCls(errors.destinatario_nombre?.message)} />
        </Field>

        <Controller name="destinatario_pais" control={control} render={({ field, fieldState }) => (
          <SelectorPais id="destinatario_pais" label={f.pais} value={field.value ?? ''} onChange={field.onChange} error={fieldState.error?.message} required />
        )} />

        <Field id="destinatario_ciudad" label={f.ciudad} error={errors.destinatario_ciudad?.message} required>
          <input id="destinatario_ciudad" {...register('destinatario_ciudad')} className={inputCls(errors.destinatario_ciudad?.message)} />
        </Field>

        <Field id="destinatario_estado" label={f.estado} error={errors.destinatario_estado?.message}>
          <input id="destinatario_estado" {...register('destinatario_estado')} placeholder={f.estadoPlaceholder} className={inputCls(errors.destinatario_estado?.message)} />
        </Field>

        <div className="md:col-span-2">
          <Controller
            name="destino_coords"
            control={control}
            render={({ field }) => (
              <MapaOpcional
                label="Ubicar destino en el mapa"
                valor={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <Field id="destinatario_telefono" label={f.telefono} error={errors.destinatario_telefono?.message} required>
          <input id="destinatario_telefono" type="tel" {...register('destinatario_telefono')} placeholder="+57 300 000 0000" className={inputCls(errors.destinatario_telefono?.message)} />
        </Field>

        <Field id="destinatario_email" label={f.email} error={errors.destinatario_email?.message}>
          <input id="destinatario_email" type="email" {...register('destinatario_email')} className={inputCls(errors.destinatario_email?.message)} />
        </Field>

        <Field id="destinatario_documento" label={f.documento} error={errors.destinatario_documento?.message}>
          <input id="destinatario_documento" {...register('destinatario_documento')} className={inputCls(errors.destinatario_documento?.message)} />
        </Field>

        <Field id="destinatario_direccion" label={f.direccion} error={errors.destinatario_direccion?.message} required className="md:col-span-2">
          <input id="destinatario_direccion" {...register('destinatario_direccion')} className={inputCls(errors.destinatario_direccion?.message)} />
        </Field>
      </Section>

      {/* ── Paquete ───────────────────────────────────── */}
      <Section title={f.seccionPaquete}>
        <Field id="descripcion_contenido" label={f.descripcion} error={errors.descripcion_contenido?.message} required className="md:col-span-2">
          <input id="descripcion_contenido" {...register('descripcion_contenido')} className={inputCls(errors.descripcion_contenido?.message)} />
        </Field>

        <Field id="peso_kg" label={f.peso} error={errors.peso_kg?.message} required>
          <input id="peso_kg" inputMode="decimal" {...register('peso_kg')} placeholder="0.00" className={inputCls(errors.peso_kg?.message)} />
        </Field>

        <Field id="largo_cm" label={f.largo} error={errors.largo_cm?.message}>
          <input id="largo_cm" inputMode="decimal" {...register('largo_cm')} placeholder="0" className={inputCls(errors.largo_cm?.message)} />
        </Field>

        <Field id="ancho_cm" label={f.ancho} error={errors.ancho_cm?.message}>
          <input id="ancho_cm" inputMode="decimal" {...register('ancho_cm')} placeholder="0" className={inputCls(errors.ancho_cm?.message)} />
        </Field>

        <Field id="alto_cm" label={f.alto} error={errors.alto_cm?.message}>
          <input id="alto_cm" inputMode="decimal" {...register('alto_cm')} placeholder="0" className={inputCls(errors.alto_cm?.message)} />
        </Field>

        <Field id="valor_declarado" label={f.valorDeclarado} error={errors.valor_declarado?.message}>
          <input id="valor_declarado" inputMode="decimal" {...register('valor_declarado')} placeholder="0.00" className={inputCls(errors.valor_declarado?.message)} />
        </Field>

        <Field id="moneda" label={f.moneda} error={errors.moneda?.message}>
          <select id="moneda" {...register('moneda')} className={inputCls(errors.moneda?.message)}>
            <option value="USD">USD — Dólar americano</option>
            <option value="EUR">EUR — Euro</option>
            <option value="COP">COP — Peso colombiano</option>
            <option value="MXN">MXN — Peso mexicano</option>
            <option value="CNY">CNY — Yuan chino</option>
            <option value="GBP">GBP — Libra esterlina</option>
          </select>
        </Field>
      </Section>

      {/* ── Servicio ──────────────────────────────────── */}
      <Section title={f.seccionServicio}>
        <Controller
          name="tipo_servicio"
          control={control}
          render={({ field }) => (
            <fieldset className="md:col-span-2">
              <legend className="sr-only">{f.tipoServicio}</legend>
              <div className="grid grid-cols-2 gap-3">
                {(['estandar', 'express'] as const).map(tipo => (
                  <label
                    key={tipo}
                    className={`cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-colors ${
                      field.value === tipo
                        ? 'border-navy bg-navy/5'
                        : 'border-border hover:border-ink-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      value={tipo}
                      checked={field.value === tipo}
                      onChange={() => field.onChange(tipo)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        field.value === tipo ? 'border-navy' : 'border-border'
                      }`}
                    >
                      {field.value === tipo && (
                        <span className="w-2 h-2 rounded-full bg-navy" />
                      )}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${field.value === tipo ? 'text-navy' : 'text-ink'}`}>
                        {tipo === 'estandar' ? f.servicioEstandar : f.servicioExpress}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />

        <Field id="fecha_estimada_entrega" label={f.fechaEstimada} error={errors.fecha_estimada_entrega?.message} className="md:col-span-2">
          <input
            id="fecha_estimada_entrega"
            type="date"
            {...register('fecha_estimada_entrega')}
            className={inputCls(errors.fecha_estimada_entrega?.message)}
          />
        </Field>
      </Section>

      {/* ── Error global ──────────────────────────────── */}
      {errors.root && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {errors.root.message}
        </div>
      )}

      {/* ── Acciones (sticky) ─────────────────────────── */}
      <div className="sticky bottom-0 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 bg-canvas border-t border-border">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-accent-strong text-white font-semibold rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? textoCargando : textoBoton}
          </button>
          {onCancelar && (
            <button
              type="button"
              onClick={handleCancelar}
              className="px-6 py-2.5 border border-border text-ink rounded-lg text-sm hover:bg-canvas transition-colors cursor-pointer"
            >
              {t.envios.formulario.botonCancelar}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
