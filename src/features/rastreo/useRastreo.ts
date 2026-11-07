import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { normalizarGuia } from '../../lib/guia'
import { type EstadoEnvio } from '../../lib/estados'

export interface EventoPublico {
  estado: EstadoEnvio
  ubicacion: string | null
  ubicacion_etiqueta: string | null
  nota_publica: string | null
  ocurrido_en: string
  lat: number | null
  lng: number | null
}

export interface DatoRastreo {
  guia: string
  estado_actual: EstadoEnvio
  tipo_servicio: 'estandar' | 'express'
  fecha_estimada_entrega: string | null
  origen_ciudad: string
  origen_estado: string | null
  origen_pais: string
  origen_lat: number | null
  origen_lng: number | null
  destino_ciudad: string
  destino_estado: string | null
  destino_pais: string
  destino_lat: number | null
  destino_lng: number | null
  destinatario: string
  eventos: EventoPublico[]
}

export type EstadoHook = 'cargando' | 'encontrado' | 'no_encontrado' | 'error'

const POLL_INTERVAL_MS = 60_000

export function useRastreo(guiaRaw: string) {
  const guia = normalizarGuia(guiaRaw)

  const [datos, setDatos] = useState<DatoRastreo | null>(null)
  const [estadoHook, setEstadoHook] = useState<EstadoHook>('cargando')
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [enVivo, setEnVivo] = useState(false)
  const [animando, setAnimando] = useState(false)

  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('rastrear_envio', { p_guia: guia })
      if (error) {
        setEstadoHook('error')
        return
      }
      if (!data) {
        setEstadoHook('no_encontrado')
        setDatos(null)
        return
      }
      setDatos(data as DatoRastreo)
      setEstadoHook('encontrado')
      setUltimaActualizacion(new Date())
    } catch {
      setEstadoHook('error')
    }
  }, [guia])

  // Carga inicial y al cambiar guía
  useEffect(() => {
    setEstadoHook('cargando')
    setDatos(null)
    buscar()
  }, [buscar])

  // Suscripción Broadcast — canal público, funciona con rol anon
  useEffect(() => {
    const canal = supabase
      .channel(`envio:${guia}`)
      .on('broadcast', { event: 'estado' }, async () => {
        if (animTimerRef.current) clearTimeout(animTimerRef.current)
        setAnimando(true)
        await buscar()
        animTimerRef.current = setTimeout(() => setAnimando(false), 700)
      })
      .subscribe(status => {
        setEnVivo(status === 'SUBSCRIBED')
      })

    return () => {
      setEnVivo(false)
      void supabase.removeChannel(canal)
      if (animTimerRef.current) clearTimeout(animTimerRef.current)
    }
  }, [guia, buscar])

  // Polling de respaldo cada 60 s mientras la pestaña esté visible
  useEffect(() => {
    if (estadoHook !== 'encontrado') return
    const interval = setInterval(() => {
      if (!document.hidden) buscar()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [estadoHook, buscar])

  return { datos, estadoHook, ultimaActualizacion, enVivo, animando, buscar }
}
