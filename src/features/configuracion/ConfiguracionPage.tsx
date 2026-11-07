import { useEffect, useRef, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, Save, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
  useConfiguracionSitio,
  normalizarWhatsApp,
  type ConfiguracionSitio,
} from '../../hooks/useConfiguracionSitio'
import { Skeleton } from '../../components/Skeleton'

// ── Schema de validación ───────────────────────────────────────────────────────

const esquema = z.object({
  whatsapp:              z.string().transform(v => normalizarWhatsApp(v)).pipe(
                           z.string().regex(/^$|^[0-9]{8,15}$/, 'Solo dígitos, 8 a 15 caracteres')
                         ),
  telefono:              z.string().max(50).optional().default(''),
  correo:                z.string().email('Correo inválido').or(z.literal('')).optional().default(''),
  direccion:             z.string().max(200).optional().default(''),
  ciudad:                z.string().max(100).optional().default(''),
  horario_atencion:      z.string().max(100).optional().default(''),
  moneda:                z.string().min(1).max(10).default('USD'),
  unidad_peso:           z.enum(['lb', 'kg']).default('lb'),
  precio_desde_estandar: z.string().transform(v => v === '' ? null : Number(v)).pipe(
                           z.number().min(0).nullable()
                         ),
  precio_desde_express:  z.string().transform(v => v === '' ? null : Number(v)).pipe(
                           z.number().min(0).nullable()
                         ),
  // Tiempos — 3 corredores × 4 campos
  usca_estandar_min: z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  usca_estandar_max: z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  usca_express_min:  z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  usca_express_max:  z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  mxus_estandar_min: z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  mxus_estandar_max: z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  mxus_express_min:  z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  mxus_express_max:  z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  estados_estandar_min: z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  estados_estandar_max: z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  estados_express_min:  z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  estados_express_max:  z.string().transform(v => v === '' ? null : Number(v)).pipe(z.number().int().min(0).nullable()),
  // Legal
  razon_social: z.string().max(200).optional().default(''),
  nit:          z.string().max(50).optional().default(''),
})

type FormValues = z.input<typeof esquema>
type FormOutput = z.output<typeof esquema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function configToForm(c: ConfiguracionSitio): FormValues {
  return {
    whatsapp:              c.whatsapp,
    telefono:              c.telefono,
    correo:                c.correo,
    direccion:             c.direccion,
    ciudad:                c.ciudad,
    horario_atencion:      c.horario_atencion,
    moneda:                c.moneda,
    unidad_peso:           c.unidad_peso,
    precio_desde_estandar: c.precio_desde_estandar != null ? String(c.precio_desde_estandar) : '',
    precio_desde_express:  c.precio_desde_express  != null ? String(c.precio_desde_express)  : '',
    usca_estandar_min: String(c.tiempos?.usca?.estandar_min ?? ''),
    usca_estandar_max: String(c.tiempos?.usca?.estandar_max ?? ''),
    usca_express_min:  String(c.tiempos?.usca?.express_min  ?? ''),
    usca_express_max:  String(c.tiempos?.usca?.express_max  ?? ''),
    mxus_estandar_min: String(c.tiempos?.mxus?.estandar_min ?? ''),
    mxus_estandar_max: String(c.tiempos?.mxus?.estandar_max ?? ''),
    mxus_express_min:  String(c.tiempos?.mxus?.express_min  ?? ''),
    mxus_express_max:  String(c.tiempos?.mxus?.express_max  ?? ''),
    estados_estandar_min: String(c.tiempos?.estados?.estandar_min ?? ''),
    estados_estandar_max: String(c.tiempos?.estados?.estandar_max ?? ''),
    estados_express_min:  String(c.tiempos?.estados?.express_min  ?? ''),
    estados_express_max:  String(c.tiempos?.estados?.express_max  ?? ''),
    razon_social: c.razon_social,
    nit:          c.nit,
  }
}

// ── Componente: campo de formulario ───────────────────────────────────────────

function Campo({
  label,
  id,
  children,
  error,
  hint,
}: {
  label: string
  id: string
  children: React.ReactNode
  error?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Input({
  id,
  type = 'text',
  placeholder,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors ${className ?? ''}`}
      {...props}
    />
  )
}

// ── Componente: sección del formulario ────────────────────────────────────────

function SeccionFormulario({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="font-display text-base font-bold text-navy">{titulo}</h2>
      {children}
    </div>
  )
}

// ── Vista previa ──────────────────────────────────────────────────────────────

function VistaPrevia({ valores }: { valores: FormValues }) {
  const wa = normalizarWhatsApp(valores.whatsapp ?? '')
  const precioStd = valores.precio_desde_estandar
  const precioExp = valores.precio_desde_express
  const moneda = valores.moneda || 'USD'

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col gap-6">
      <h2 className="font-display text-base font-bold text-navy">Vista previa</h2>

      {/* Contacto */}
      <div>
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Franja de contacto</p>
        <div className="bg-navy rounded-xl p-4 flex flex-wrap gap-4 text-sm text-white/80">
          {valores.telefono ? (
            <span>📞 {valores.telefono}</span>
          ) : (
            <span className="opacity-40 italic">Teléfono oculto</span>
          )}
          {valores.correo ? (
            <span>✉ {valores.correo}</span>
          ) : (
            <span className="opacity-40 italic">Correo oculto</span>
          )}
          {wa ? (
            <span>💬 WhatsApp disponible</span>
          ) : (
            <span className="opacity-40 italic">WhatsApp oculto</span>
          )}
        </div>
      </div>

      {/* Servicios */}
      <div>
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Tarjetas de servicio</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border-subtle rounded-xl p-3">
            <p className="text-xs text-ink-muted mb-1">Estándar</p>
            <p className="font-semibold text-sm text-navy">
              {precioStd !== '' && precioStd != null
                ? `Desde ${moneda} ${Number(precioStd).toFixed(2)} / ${valores.unidad_peso}`
                : 'Cotiza tu envío'}
            </p>
          </div>
          <div className="border border-border-subtle rounded-xl p-3">
            <p className="text-xs text-ink-muted mb-1">Express</p>
            <p className="font-semibold text-sm text-navy">
              {precioExp !== '' && precioExp != null
                ? `Desde ${moneda} ${Number(precioExp).toFixed(2)} / ${valores.unidad_peso}`
                : 'Cotiza tu envío'}
            </p>
          </div>
        </div>
      </div>

      {/* Pie */}
      <div>
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Pie de página</p>
        <div className="bg-navy-deep rounded-xl p-3 text-xs text-white/70">
          {valores.razon_social && valores.nit
            ? `${valores.razon_social} · NIT ${valores.nit}`
            : '© 2026 Nexpak'}
          {valores.ciudad ? ` · ${valores.ciudad}` : ''}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { perfil } = useAuth()
  const { config, cargando } = useConfiguracionSitio()
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<{ fecha: string; nombre: string } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const esAdmin = perfil?.rol === 'admin'

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(esquema),
    defaultValues: configToForm(config),
  })

  // Cuando la config cargue, inicializar el formulario
  useEffect(() => {
    if (!cargando) {
      reset(configToForm(config))
      // Cargar metadatos de auditoría
      supabase
        .from('configuracion_sitio')
        .select('updated_at, actualizado_por')
        .single()
        .then(async ({ data }) => {
          if (!data) return
          let nombre = 'Desconocido'
          if (data.actualizado_por) {
            const { data: p } = await supabase
              .from('perfiles')
              .select('nombre')
              .eq('id', data.actualizado_por)
              .single()
            if (p) nombre = p.nombre
          }
          setUltimaActualizacion({
            fecha: new Intl.DateTimeFormat('es', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(data.updated_at)),
            nombre,
          })
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando])

  function mostrarToast(msg: string) {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast(msg)
    toastRef.current = setTimeout(() => setToast(null), 3500)
  }

  const onSubmit: SubmitHandler<FormOutput> = async (data) => {
    if (!esAdmin) return
    setGuardando(true)
    try {
      const tiempos = {
        usca:    { estandar_min: data.usca_estandar_min,  estandar_max: data.usca_estandar_max,  express_min: data.usca_express_min,  express_max: data.usca_express_max  },
        mxus:    { estandar_min: data.mxus_estandar_min,  estandar_max: data.mxus_estandar_max,  express_min: data.mxus_express_min,  express_max: data.mxus_express_max  },
        estados: { estandar_min: data.estados_estandar_min, estandar_max: data.estados_estandar_max, express_min: data.estados_express_min, express_max: data.estados_express_max },
      }

      const { error } = await supabase
        .from('configuracion_sitio')
        .update({
          whatsapp:              data.whatsapp              ?? '',
          telefono:              data.telefono              ?? '',
          correo:                data.correo                ?? '',
          direccion:             data.direccion             ?? '',
          ciudad:                data.ciudad                ?? '',
          horario_atencion:      data.horario_atencion      ?? '',
          moneda:                data.moneda,
          unidad_peso:           data.unidad_peso,
          precio_desde_estandar: data.precio_desde_estandar,
          precio_desde_express:  data.precio_desde_express,
          tiempos,
          razon_social:          data.razon_social          ?? '',
          nit:                   data.nit                   ?? '',
          actualizado_por:       perfil?.id ?? null,
        })
        .eq('id', 1)

      if (error) throw new Error(error.message)

      mostrarToast('Configuración guardada correctamente')
      // Reconstruir el config guardado y pasarlo a configToForm para que reset
      // reciba valores en formato string (FormValues), no en formato número (FormOutput).
      reset(configToForm({
        whatsapp:              data.whatsapp              ?? '',
        telefono:              data.telefono              ?? '',
        correo:                data.correo                ?? '',
        direccion:             data.direccion             ?? '',
        ciudad:                data.ciudad                ?? '',
        horario_atencion:      data.horario_atencion      ?? '',
        moneda:                data.moneda,
        unidad_peso:           data.unidad_peso,
        precio_desde_estandar: data.precio_desde_estandar,
        precio_desde_express:  data.precio_desde_express,
        tiempos,
        razon_social:          data.razon_social          ?? '',
        nit:                   data.nit                   ?? '',
      }))
      if (perfil) {
        setUltimaActualizacion({
          fecha: new Intl.DateTimeFormat('es', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }).format(new Date()),
          nombre: perfil.nombre,
        })
      }
    } catch (e) {
      mostrarToast('Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // Acceso denegado a operadores
  if (!esAdmin && !cargando) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield size={48} strokeWidth={1} className="text-navy/20 mb-4" />
        <h1 className="font-display text-xl font-bold text-navy mb-2">Acceso restringido</h1>
        <p className="text-sm text-ink-muted">Solo los administradores pueden editar la configuración del sitio.</p>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="p-6 lg:p-8 flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    )
  }

  const valores = watch()
  const waNum = normalizarWhatsApp(valores.whatsapp ?? '')

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="p-6 lg:p-8 flex flex-col gap-6">

        {/* Encabezado */}
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Configuración del sitio</h1>
            {ultimaActualizacion && (
              <p className="text-sm text-ink-muted mt-1">
                Última modificación: {ultimaActualizacion.fecha} por {ultimaActualizacion.nombre}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={guardando || !isDirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-strong text-white rounded-[10px] text-sm font-semibold hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-11 cursor-pointer"
          >
            <Save size={16} strokeWidth={2} aria-hidden="true" />
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          <div className="flex flex-col gap-6">

            {/* Contacto */}
            <SeccionFormulario titulo="Contacto">
              <Campo label="WhatsApp" id="whatsapp" error={errors.whatsapp?.message}
                hint="Número en formato internacional sin espacios (ej. 15551234567). Solo se guardará con dígitos.">
                <div className="flex gap-2">
                  <Input
                    id="whatsapp"
                    placeholder="15551234567"
                    {...register('whatsapp')}
                    className="flex-1"
                  />
                  {waNum && (
                    <a
                      href={`https://wa.me/${waNum}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2.5 border border-border-subtle rounded-[10px] text-sm text-navy hover:bg-canvas transition-colors whitespace-nowrap"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      Probar enlace
                    </a>
                  )}
                </div>
                {waNum && (
                  <p className="text-xs text-ink-muted mt-1">
                    Enlace: <code className="font-mono bg-canvas px-1 rounded">https://wa.me/{waNum}</code>
                  </p>
                )}
              </Campo>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Campo label="Teléfono (para mostrar)" id="telefono" error={errors.telefono?.message}>
                  <Input id="telefono" placeholder="+1 (555) 123-4567" {...register('telefono')} />
                </Campo>
                <Campo label="Correo" id="correo" error={errors.correo?.message}>
                  <Input id="correo" type="email" placeholder="contacto@nexpak.com" {...register('correo')} />
                </Campo>
                <Campo label="Dirección" id="direccion">
                  <Input id="direccion" placeholder="Calle 123, Suite 10" {...register('direccion')} />
                </Campo>
                <Campo label="Ciudad" id="ciudad">
                  <Input id="ciudad" placeholder="Houston, TX" {...register('ciudad')} />
                </Campo>
                <div className="sm:col-span-2">
                  <Campo label="Horario de atención" id="horario_atencion">
                    <Input id="horario_atencion" placeholder="Lun–Vie 9 am–6 pm" {...register('horario_atencion')} />
                  </Campo>
                </div>
              </div>
            </SeccionFormulario>

            {/* Precios */}
            <SeccionFormulario titulo="Precios">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Campo label="Moneda" id="moneda">
                  <select
                    id="moneda"
                    {...register('moneda')}
                    className="w-full px-3.5 py-2.5 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer"
                  >
                    <option value="USD">USD – Dólar</option>
                    <option value="CAD">CAD – Dólar canadiense</option>
                    <option value="MXN">MXN – Peso mexicano</option>
                  </select>
                </Campo>
                <Campo label="Unidad de peso" id="unidad_peso">
                  <select
                    id="unidad_peso"
                    {...register('unidad_peso')}
                    className="w-full px-3.5 py-2.5 border border-border-subtle rounded-[10px] text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors cursor-pointer"
                  >
                    <option value="lb">libra (lb)</option>
                    <option value="kg">kilogramo (kg)</option>
                  </select>
                </Campo>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Campo label="Precio desde — Estándar" id="precio_desde_estandar" error={errors.precio_desde_estandar?.message}
                  hint={`Dejar vacío muestra "Cotiza tu envío"`}>
                  <Input id="precio_desde_estandar" type="number" step="0.01" min="0" placeholder="0.00"
                    {...register('precio_desde_estandar')} />
                </Campo>
                <Campo label="Precio desde — Express" id="precio_desde_express" error={errors.precio_desde_express?.message}
                  hint={`Dejar vacío muestra "Cotiza tu envío"`}>
                  <Input id="precio_desde_express" type="number" step="0.01" min="0" placeholder="0.00"
                    {...register('precio_desde_express')} />
                </Campo>
              </div>
            </SeccionFormulario>

            {/* Tiempos por ruta */}
            <SeccionFormulario titulo="Tiempos por ruta (días hábiles)">
              {(['usca', 'mxus', 'estados'] as const).map(corredor => {
                const labels: Record<string, string> = {
                  usca: 'Estados Unidos ⇄ Canadá',
                  mxus: 'México → Estados Unidos',
                  estados: 'Entre estados',
                }
                return (
                  <div key={corredor}>
                    <p className="text-sm font-semibold text-ink mb-3">{labels[corredor]}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Campo label="Estándar mín." id={`${corredor}_estandar_min`}>
                        <Input id={`${corredor}_estandar_min`} type="number" min="0" placeholder="—"
                          {...register(`${corredor}_estandar_min` as keyof FormValues)} />
                      </Campo>
                      <Campo label="Estándar máx." id={`${corredor}_estandar_max`}>
                        <Input id={`${corredor}_estandar_max`} type="number" min="0" placeholder="—"
                          {...register(`${corredor}_estandar_max` as keyof FormValues)} />
                      </Campo>
                      <Campo label="Express mín." id={`${corredor}_express_min`}>
                        <Input id={`${corredor}_express_min`} type="number" min="0" placeholder="—"
                          {...register(`${corredor}_express_min` as keyof FormValues)} />
                      </Campo>
                      <Campo label="Express máx." id={`${corredor}_express_max`}>
                        <Input id={`${corredor}_express_max`} type="number" min="0" placeholder="—"
                          {...register(`${corredor}_express_max` as keyof FormValues)} />
                      </Campo>
                    </div>
                  </div>
                )
              })}
            </SeccionFormulario>

            {/* Datos legales */}
            <SeccionFormulario titulo="Datos legales">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Campo label="Razón social" id="razon_social">
                  <Input id="razon_social" placeholder="Nexpak International LLC" {...register('razon_social')} />
                </Campo>
                <Campo label="NIT / EIN" id="nit">
                  <Input id="nit" placeholder="12-3456789" {...register('nit')} />
                </Campo>
              </div>
            </SeccionFormulario>

          </div>

          {/* Vista previa — solo escritorio */}
          <div className="hidden xl:block">
            <div className="sticky top-6">
              <VistaPrevia valores={valores} />
            </div>
          </div>
        </div>

        {/* Vista previa — móvil/tablet */}
        <div className="xl:hidden">
          <VistaPrevia valores={valores} />
        </div>

        {/* Botón guardar inferior */}
        {isDirty && (
          <div className="sticky bottom-6 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-6 py-3 bg-accent-strong text-white rounded-[10px] text-sm font-semibold hover:bg-accent disabled:opacity-50 cursor-pointer transition-colors shadow-lg"
            >
              <Save size={16} strokeWidth={2} aria-hidden="true" />
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm font-medium px-5 py-3 rounded-xl pointer-events-none"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
          {toast}
        </div>
      )}
    </form>
  )
}
