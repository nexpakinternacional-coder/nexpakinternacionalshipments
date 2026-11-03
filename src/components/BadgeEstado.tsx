import {
  AlertCircle,
  Building,
  CheckCircle,
  CornerDownLeft,
  FileText,
  Package,
  Plane,
  Shield,
  ShieldCheck,
  ShieldX,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { ESTADOS, type EstadoEnvio } from '../lib/estados'

const ICONOS: Record<string, LucideIcon> = {
  'file-text': FileText,
  package: Package,
  plane: Plane,
  shield: Shield,
  'shield-check': ShieldCheck,
  building: Building,
  truck: Truck,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'shield-x': ShieldX,
  'x-circle': XCircle,
  'corner-down-left': CornerDownLeft,
}

export default function BadgeEstado({
  estado,
  size = 'md',
}: {
  estado: EstadoEnvio
  size?: 'sm' | 'md'
}) {
  const info = ESTADOS[estado]
  const Icon = ICONOS[info.icono] ?? Package
  const cls =
    size === 'sm'
      ? 'text-xs px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5'
  const iconSize = size === 'sm' ? 11 : 12

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${cls} ${info.colorFondo} ${info.colorTexto}`}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
      {info.etiqueta}
    </span>
  )
}
