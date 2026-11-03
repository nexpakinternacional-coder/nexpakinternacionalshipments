import { z } from 'zod'

const tel = /^[+\d][\d\s()\-.]{3,24}$/

const numOpcional = z.preprocess(
  v =>
    v === '' || v === undefined || v === null || (typeof v === 'number' && isNaN(v))
      ? null
      : Number(String(v).replace(',', '.')),
  z.number().nonnegative('Debe ser ≥ 0').nullable(),
)

const numPositivo = z.preprocess(
  v =>
    v === '' || v === undefined || v === null || (typeof v === 'number' && isNaN(v))
      ? undefined
      : Number(String(v).replace(',', '.')),
  z.number().positive('Debe ser mayor que 0'),
)

export const envioSchema = z.object({
  remitente_nombre: z.string().min(1, 'Este campo es requerido'),
  remitente_telefono: z
    .string()
    .regex(tel, 'Formato inválido (ej. +57 300 000 0000)')
    .optional()
    .or(z.literal('')),
  remitente_email: z.string().email('Correo inválido').optional().or(z.literal('')),
  remitente_direccion: z.string().optional().or(z.literal('')),
  remitente_pais: z.string().min(1, 'Este campo es requerido'),
  remitente_ciudad: z.string().min(1, 'Este campo es requerido'),

  destinatario_nombre: z.string().min(1, 'Este campo es requerido'),
  destinatario_telefono: z
    .string()
    .regex(tel, 'Formato inválido (ej. +57 300 000 0000)')
    .min(1, 'Este campo es requerido'),
  destinatario_email: z.string().email('Correo inválido').optional().or(z.literal('')),
  destinatario_documento: z.string().optional().or(z.literal('')),
  destinatario_direccion: z.string().min(1, 'Este campo es requerido'),
  destinatario_pais: z.string().min(1, 'Este campo es requerido'),
  destinatario_ciudad: z.string().min(1, 'Este campo es requerido'),

  descripcion_contenido: z.string().min(1, 'Este campo es requerido'),
  peso_kg: numPositivo,
  largo_cm: numOpcional,
  ancho_cm: numOpcional,
  alto_cm: numOpcional,
  valor_declarado: numOpcional,
  moneda: z.string().min(1).default('USD'),
  tipo_servicio: z.enum(['estandar', 'express']).default('estandar'),
  fecha_estimada_entrega: z.string().optional().or(z.literal('')).nullable(),
})

export type EnvioFormData = z.infer<typeof envioSchema>
