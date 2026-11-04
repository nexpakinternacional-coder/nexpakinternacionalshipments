import isotipoColorUrl from '../assets/marca/isotipo.svg?url'
import isotipoBlancUrl from '../assets/marca/isotipo-blanco.svg?url'
import isotipoNegroUrl from '../assets/marca/isotipo-negro.svg?url'
import horizontalColorUrl from '../assets/marca/logo-horizontal.svg?url'
import horizontalBlancUrl from '../assets/marca/logo-horizontal-blanco.svg?url'
import horizontalNegroUrl from '../assets/marca/logo-horizontal-negro.svg?url'

// Relación ancho/alto basada en los viewBox originales
const ASPECTO: Record<'horizontal' | 'isotipo', number> = {
  horizontal: 365.88 / 68,
  isotipo: 80 / 68,
}

const URLS: Record<'horizontal' | 'isotipo', Record<'color' | 'blanco' | 'negro', string>> = {
  horizontal: { color: horizontalColorUrl, blanco: horizontalBlancUrl, negro: horizontalNegroUrl },
  isotipo: { color: isotipoColorUrl, blanco: isotipoBlancUrl, negro: isotipoNegroUrl },
}

interface LogoProps {
  variante?: 'horizontal' | 'isotipo'
  tono?: 'color' | 'blanco' | 'negro'
  /** Alto en px; el ancho se calcula automáticamente por la proporción del viewBox */
  alto: number
  /** Por defecto "Nexpak". Pasar alt="" cuando el logo está dentro de un enlace con aria-label. */
  alt?: string
  className?: string
}

export default function Logo({
  variante = 'horizontal',
  tono = 'color',
  alto,
  alt = 'Nexpak',
  className,
}: LogoProps) {
  const src = URLS[variante][tono]
  const ancho = Math.round(alto * ASPECTO[variante])
  return (
    <img
      src={src}
      alt={alt}
      width={ancho}
      height={alto}
      className={className}
      style={{ width: ancho, height: alto, flexShrink: 0 }}
      draggable={false}
    />
  )
}
