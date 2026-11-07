/**
 * Datos de negocio configurables.
 * Reemplaza los valores entre corchetes antes de publicar.
 */
export const empresa = {
  /** Número de WhatsApp en formato internacional, sin espacios ni guiones (ej. 15551234567) */
  whatsapp: '[NÚMERO_WHATSAPP]',
  correo: '[CORREO]',
  telefono: '[TELÉFONO]',
  direccion: '[DIRECCIÓN]',
  ciudad: '[CIUDAD]',
  razonSocial: '[RAZÓN SOCIAL]',
  nit: '[NIT]',

  rutas: {
    usca: { estandar: '[X–Y]', express: '[X–Y]' },
    mxus: { estandar: '[X–Y]', express: '[X–Y]' },
    estados: { estandar: '[X–Y]', express: '[X–Y]' },
  },

  servicios: {
    estandar: { precio: '[PRECIO]' },
    express: { precio: '[PRECIO]' },
  },
} as const

/** Genera URL de WhatsApp con mensaje prellenado. guia es opcional. */
export function urlWhatsApp(mensaje?: string): string {
  const base = `https://wa.me/${empresa.whatsapp}`
  if (!mensaje) return base
  return `${base}?text=${encodeURIComponent(mensaje)}`
}

/** Mensaje WhatsApp para un envío con guía */
export function mensajeWhatsAppGuia(guia: string): string {
  return `Hola, tengo una pregunta sobre mi envío con guía ${guia}.`
}
