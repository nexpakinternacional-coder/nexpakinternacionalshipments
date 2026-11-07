import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createElement } from 'react'
import { supabase } from '../lib/supabase'
import { empresa } from '../config/empresa'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TiemposCorredor {
  estandar_min?: number | null
  estandar_max?: number | null
  express_min?: number | null
  express_max?: number | null
}

export interface TiemposCorredores {
  usca?: TiemposCorredor
  mxus?: TiemposCorredor
  estados?: TiemposCorredor
}

export interface ConfiguracionSitio {
  whatsapp: string
  telefono: string
  correo: string
  direccion: string
  ciudad: string
  horario_atencion: string
  moneda: string
  unidad_peso: 'lb' | 'kg'
  precio_desde_estandar: number | null
  precio_desde_express: number | null
  tiempos: TiemposCorredores
  razon_social: string
  nit: string
}

// Valores de respaldo desde empresa.ts si la consulta falla
const FALLBACK: ConfiguracionSitio = {
  whatsapp:              empresa.whatsapp.replace(/\D/g, ''),
  telefono:              empresa.telefono,
  correo:                empresa.correo,
  direccion:             empresa.direccion,
  ciudad:                empresa.ciudad,
  horario_atencion:      '',
  moneda:                'USD',
  unidad_peso:           'lb',
  precio_desde_estandar: null,
  precio_desde_express:  null,
  tiempos:               {},
  razon_social:          empresa.razonSocial,
  nit:                   empresa.nit,
}

// ── Contexto ──────────────────────────────────────────────────────────────────

interface ConfiguracionContextValue {
  config: ConfiguracionSitio
  cargando: boolean
  error: boolean
}

const ConfiguracionContext = createContext<ConfiguracionContextValue>({
  config: FALLBACK,
  cargando: true,
  error: false,
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function ConfiguracionProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfiguracionSitio>(FALLBACK)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(false)
      try {
        const { data, error: err } = await (
          supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>
        )('configuracion_publica')

        if (err || !data) {
          setError(true)
          setCargando(false)
          return
        }

        const raw = data as Record<string, unknown>
        setConfig({
          whatsapp:              String(raw.whatsapp              ?? ''),
          telefono:              String(raw.telefono              ?? ''),
          correo:                String(raw.correo                ?? ''),
          direccion:             String(raw.direccion             ?? ''),
          ciudad:                String(raw.ciudad                ?? ''),
          horario_atencion:      String(raw.horario_atencion      ?? ''),
          moneda:                String(raw.moneda                ?? 'USD'),
          unidad_peso:           (raw.unidad_peso === 'kg' ? 'kg' : 'lb'),
          precio_desde_estandar: raw.precio_desde_estandar != null ? Number(raw.precio_desde_estandar) : null,
          precio_desde_express:  raw.precio_desde_express  != null ? Number(raw.precio_desde_express)  : null,
          tiempos:               (raw.tiempos as TiemposCorredores) ?? {},
          razon_social:          String(raw.razon_social    ?? ''),
          nit:                   String(raw.nit             ?? ''),
        })
      } catch {
        setError(true)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  return createElement(ConfiguracionContext.Provider, { value: { config, cargando, error } }, children)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConfiguracionSitio() {
  return useContext(ConfiguracionContext)
}

// ── Helper: formato de rango de días ─────────────────────────────────────────

export function formatearRangoDias(corredor: TiemposCorredor | undefined, tipo: 'estandar' | 'express'): string | null {
  if (!corredor) return null
  const min = tipo === 'estandar' ? corredor.estandar_min : corredor.express_min
  const max = tipo === 'estandar' ? corredor.estandar_max : corredor.express_max
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min}–${max}`
  return String(min ?? max)
}

// ── Helper: normalizar WhatsApp ───────────────────────────────────────────────

export function normalizarWhatsApp(input: string): string {
  return input.replace(/\D/g, '')
}

// ── Helper: URL WhatsApp ──────────────────────────────────────────────────────

export function urlWhatsAppConfig(config: ConfiguracionSitio, mensaje?: string): string {
  const num = config.whatsapp
  if (!num) return '#'
  const base = `https://wa.me/${num}`
  if (!mensaje) return base
  return `${base}?text=${encodeURIComponent(mensaje)}`
}
