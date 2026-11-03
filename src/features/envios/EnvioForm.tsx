import { type Resolver, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { envioSchema, type EnvioFormData } from './schema'
import SelectorPais from './SelectorPais'
import { t } from '../../textos/es'

interface EnvioFormProps {
  defaultValues?: Partial<EnvioFormData>
  onGuardar: (data: EnvioFormData) => Promise<void>
  textoBoton?: string
  textoCargando?: string
  onCancelar?: () => void
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

export default function EnvioForm({
  defaultValues,
  onGuardar,
  textoBoton = t.envios.formulario.botonGuardar,
  textoCargando = t.envios.formulario.cargando,
  onCancelar,
}: EnvioFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EnvioFormData>({
    // Cast needed: z.preprocess gives `unknown` input in Zod v4, but form values are EnvioFormData
    resolver: zodResolver(envioSchema) as unknown as Resolver<EnvioFormData>,
    defaultValues: {
      moneda: 'USD',
      tipo_servicio: 'estandar',
      ...defaultValues,
    },
  })

  async function onSubmit(data: EnvioFormData) {
    try {
      await onGuardar(data)
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : t.envios.formulario.error,
      })
    }
  }

  const f = t.envios.formulario

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
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

      {/* ── Acciones ──────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
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
            onClick={onCancelar}
            className="px-6 py-2.5 border border-border text-ink rounded-lg text-sm hover:bg-canvas transition-colors cursor-pointer"
          >
            {t.envios.formulario.botonCancelar}
          </button>
        )}
      </div>
    </form>
  )
}
