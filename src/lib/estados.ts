export type EstadoEnvio =
  | 'guia_generada'
  | 'recibido_origen'
  | 'transito_internacional'
  | 'en_aduana'
  | 'liberado_aduana'
  | 'centro_distribucion'
  | 'en_reparto'
  | 'entregado'
  | 'novedad'
  | 'retenido_aduana'
  | 'intento_fallido'
  | 'devuelto'

export interface InfoEstado {
  etiqueta: string
  colorFondo: string
  colorTexto: string
  icono: string
  esExcepcion: boolean
}

export const ESTADOS: Record<EstadoEnvio, InfoEstado> = {
  guia_generada: {
    etiqueta: 'Guía generada',
    colorFondo: 'bg-slate-100',
    colorTexto: 'text-slate-700',
    icono: 'file-text',
    esExcepcion: false,
  },
  recibido_origen: {
    etiqueta: 'Recibido en origen',
    colorFondo: 'bg-blue-100',
    colorTexto: 'text-blue-700',
    icono: 'package',
    esExcepcion: false,
  },
  transito_internacional: {
    etiqueta: 'En tránsito',
    colorFondo: 'bg-indigo-100',
    colorTexto: 'text-indigo-700',
    icono: 'plane',
    esExcepcion: false,
  },
  en_aduana: {
    etiqueta: 'En aduana',
    colorFondo: 'bg-yellow-100',
    colorTexto: 'text-yellow-800',
    icono: 'shield',
    esExcepcion: false,
  },
  liberado_aduana: {
    etiqueta: 'Liberado de aduana',
    colorFondo: 'bg-teal-100',
    colorTexto: 'text-teal-700',
    icono: 'shield-check',
    esExcepcion: false,
  },
  centro_distribucion: {
    etiqueta: 'Centro de distribución',
    colorFondo: 'bg-purple-100',
    colorTexto: 'text-purple-700',
    icono: 'building',
    esExcepcion: false,
  },
  en_reparto: {
    etiqueta: 'En reparto',
    colorFondo: 'bg-orange-100',
    colorTexto: 'text-orange-700',
    icono: 'truck',
    esExcepcion: false,
  },
  entregado: {
    etiqueta: 'Entregado',
    colorFondo: 'bg-green-100',
    colorTexto: 'text-green-700',
    icono: 'check-circle',
    esExcepcion: false,
  },
  novedad: {
    etiqueta: 'Novedad',
    colorFondo: 'bg-red-100',
    colorTexto: 'text-red-700',
    icono: 'alert-circle',
    esExcepcion: true,
  },
  retenido_aduana: {
    etiqueta: 'Retenido en aduana',
    colorFondo: 'bg-red-100',
    colorTexto: 'text-red-700',
    icono: 'shield-x',
    esExcepcion: true,
  },
  intento_fallido: {
    etiqueta: 'Intento fallido',
    colorFondo: 'bg-amber-100',
    colorTexto: 'text-amber-800',
    icono: 'x-circle',
    esExcepcion: true,
  },
  devuelto: {
    etiqueta: 'Devuelto',
    colorFondo: 'bg-slate-100',
    colorTexto: 'text-slate-700',
    icono: 'corner-down-left',
    esExcepcion: true,
  },
}

export const FLUJO_NORMAL: EstadoEnvio[] = [
  'guia_generada',
  'recibido_origen',
  'transito_internacional',
  'en_aduana',
  'liberado_aduana',
  'centro_distribucion',
  'en_reparto',
  'entregado',
]

export const ESTADOS_EXCEPCION: EstadoEnvio[] = [
  'novedad',
  'retenido_aduana',
  'intento_fallido',
  'devuelto',
]
