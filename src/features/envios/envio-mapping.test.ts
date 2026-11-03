import { describe, it, expect } from 'vitest'

// Mirrors the mapping done in DetalleEnvioPage for DB → form and form → DB update

interface DbEnvio {
  remitente_nombre: string
  remitente_telefono: string | null
  remitente_email: string | null
  remitente_direccion: string | null
  remitente_pais: string
  remitente_ciudad: string
  destinatario_nombre: string
  destinatario_telefono: string | null
  destinatario_email: string | null
  destinatario_documento: string | null
  destinatario_direccion: string | null
  destinatario_pais: string
  destinatario_ciudad: string
  descripcion_contenido: string | null
  peso_kg: number | null
  largo_cm: number | null
  ancho_cm: number | null
  alto_cm: number | null
  valor_declarado: number | null
  moneda: string
  tipo_servicio: 'estandar' | 'express'
  fecha_estimada_entrega: string | null
}

interface FormData {
  remitente_nombre: string
  remitente_telefono: string
  remitente_email: string
  remitente_direccion: string
  remitente_pais: string
  remitente_ciudad: string
  destinatario_nombre: string
  destinatario_telefono: string
  destinatario_email: string
  destinatario_documento: string
  destinatario_direccion: string
  destinatario_pais: string
  destinatario_ciudad: string
  descripcion_contenido: string
  peso_kg: number | undefined
  largo_cm: number | null | undefined
  ancho_cm: number | null | undefined
  alto_cm: number | null | undefined
  valor_declarado: number | null | undefined
  moneda: string
  tipo_servicio: 'estandar' | 'express'
  fecha_estimada_entrega: string
}

function dbAForm(envio: DbEnvio): FormData {
  return {
    remitente_nombre: envio.remitente_nombre,
    remitente_telefono: envio.remitente_telefono ?? '',
    remitente_email: envio.remitente_email ?? '',
    remitente_direccion: envio.remitente_direccion ?? '',
    remitente_pais: envio.remitente_pais,
    remitente_ciudad: envio.remitente_ciudad,
    destinatario_nombre: envio.destinatario_nombre,
    destinatario_telefono: envio.destinatario_telefono ?? '',
    destinatario_email: envio.destinatario_email ?? '',
    destinatario_documento: envio.destinatario_documento ?? '',
    destinatario_direccion: envio.destinatario_direccion ?? '',
    destinatario_pais: envio.destinatario_pais,
    destinatario_ciudad: envio.destinatario_ciudad,
    descripcion_contenido: envio.descripcion_contenido ?? '',
    peso_kg: envio.peso_kg ?? undefined,
    largo_cm: envio.largo_cm ?? undefined,
    ancho_cm: envio.ancho_cm ?? undefined,
    alto_cm: envio.alto_cm ?? undefined,
    valor_declarado: envio.valor_declarado ?? undefined,
    moneda: envio.moneda,
    tipo_servicio: envio.tipo_servicio,
    fecha_estimada_entrega: envio.fecha_estimada_entrega ?? '',
  }
}

function formADb(data: FormData): Partial<DbEnvio> {
  return {
    remitente_nombre: data.remitente_nombre,
    remitente_telefono: data.remitente_telefono || null,
    remitente_email: data.remitente_email || null,
    remitente_direccion: data.remitente_direccion || null,
    remitente_pais: data.remitente_pais,
    remitente_ciudad: data.remitente_ciudad,
    destinatario_nombre: data.destinatario_nombre,
    destinatario_telefono: data.destinatario_telefono || null,
    destinatario_email: data.destinatario_email || null,
    destinatario_documento: data.destinatario_documento || null,
    destinatario_direccion: data.destinatario_direccion || null,
    destinatario_pais: data.destinatario_pais,
    destinatario_ciudad: data.destinatario_ciudad,
    descripcion_contenido: data.descripcion_contenido || null,
    peso_kg: data.peso_kg ?? null,
    largo_cm: data.largo_cm ?? null,
    ancho_cm: data.ancho_cm ?? null,
    alto_cm: data.alto_cm ?? null,
    valor_declarado: data.valor_declarado ?? null,
    moneda: data.moneda,
    tipo_servicio: data.tipo_servicio,
    fecha_estimada_entrega: data.fecha_estimada_entrega || null,
  }
}

const envioCompleto: DbEnvio = {
  remitente_nombre: 'Empresa ABC',
  remitente_telefono: '+57 300 123 4567',
  remitente_email: 'ventas@abc.com',
  remitente_direccion: 'Calle 10 # 20-30',
  remitente_pais: 'Colombia',
  remitente_ciudad: 'Bogotá',
  destinatario_nombre: 'Juan Pérez',
  destinatario_telefono: '+1 305 555 0000',
  destinatario_email: 'juan@example.com',
  destinatario_documento: '12345678',
  destinatario_direccion: '100 Main St',
  destinatario_pais: 'Estados Unidos',
  destinatario_ciudad: 'Miami',
  descripcion_contenido: 'Ropa y accesorios',
  peso_kg: 2.5,
  largo_cm: 40,
  ancho_cm: 30,
  alto_cm: 20,
  valor_declarado: 150,
  moneda: 'USD',
  tipo_servicio: 'express',
  fecha_estimada_entrega: '2026-11-20',
}

const envioIncompleto: DbEnvio = {
  remitente_nombre: 'Empresa XYZ',
  remitente_telefono: null,
  remitente_email: null,
  remitente_direccion: null,
  remitente_pais: 'Colombia',
  remitente_ciudad: 'Medellín',
  destinatario_nombre: 'María García',
  destinatario_telefono: null,
  destinatario_email: null,
  destinatario_documento: null,
  destinatario_direccion: null,
  destinatario_pais: 'Venezuela',
  destinatario_ciudad: 'Caracas',
  descripcion_contenido: null,
  peso_kg: null,
  largo_cm: null,
  ancho_cm: null,
  alto_cm: null,
  valor_declarado: null,
  moneda: 'USD',
  tipo_servicio: 'estandar',
  fecha_estimada_entrega: null,
}

describe('dbAForm', () => {
  it('convierte campos null a cadenas vacías', () => {
    const form = dbAForm(envioIncompleto)
    expect(form.remitente_telefono).toBe('')
    expect(form.remitente_email).toBe('')
    expect(form.remitente_direccion).toBe('')
    expect(form.destinatario_telefono).toBe('')
    expect(form.destinatario_email).toBe('')
    expect(form.destinatario_documento).toBe('')
    expect(form.destinatario_direccion).toBe('')
    expect(form.descripcion_contenido).toBe('')
    expect(form.fecha_estimada_entrega).toBe('')
  })

  it('convierte números null a undefined', () => {
    const form = dbAForm(envioIncompleto)
    expect(form.peso_kg).toBeUndefined()
    expect(form.largo_cm).toBeUndefined()
    expect(form.ancho_cm).toBeUndefined()
    expect(form.alto_cm).toBeUndefined()
    expect(form.valor_declarado).toBeUndefined()
  })

  it('preserva todos los valores del envío completo', () => {
    const form = dbAForm(envioCompleto)
    expect(form.remitente_nombre).toBe('Empresa ABC')
    expect(form.remitente_telefono).toBe('+57 300 123 4567')
    expect(form.destinatario_nombre).toBe('Juan Pérez')
    expect(form.peso_kg).toBe(2.5)
    expect(form.tipo_servicio).toBe('express')
    expect(form.fecha_estimada_entrega).toBe('2026-11-20')
    expect(form.moneda).toBe('USD')
  })
})

describe('formADb', () => {
  it('convierte cadenas vacías a null', () => {
    const form = dbAForm(envioIncompleto)
    const db = formADb(form)
    expect(db.remitente_telefono).toBeNull()
    expect(db.remitente_email).toBeNull()
    expect(db.destinatario_telefono).toBeNull()
    expect(db.fecha_estimada_entrega).toBeNull()
  })

  it('convierte undefined a null para números', () => {
    const form = dbAForm(envioIncompleto)
    const db = formADb(form)
    expect(db.peso_kg).toBeNull()
    expect(db.largo_cm).toBeNull()
    expect(db.valor_declarado).toBeNull()
  })
})

describe('round-trip DB → form → DB', () => {
  it('no pierde datos en envío completo', () => {
    const form = dbAForm(envioCompleto)
    const db = formADb(form)
    expect(db.remitente_nombre).toBe(envioCompleto.remitente_nombre)
    expect(db.remitente_telefono).toBe(envioCompleto.remitente_telefono)
    expect(db.remitente_email).toBe(envioCompleto.remitente_email)
    expect(db.destinatario_nombre).toBe(envioCompleto.destinatario_nombre)
    expect(db.peso_kg).toBe(envioCompleto.peso_kg)
    expect(db.tipo_servicio).toBe(envioCompleto.tipo_servicio)
    expect(db.fecha_estimada_entrega).toBe(envioCompleto.fecha_estimada_entrega)
    expect(db.moneda).toBe(envioCompleto.moneda)
  })

  it('conserva null en envío incompleto', () => {
    const form = dbAForm(envioIncompleto)
    const db = formADb(form)
    expect(db.remitente_telefono).toBeNull()
    expect(db.destinatario_direccion).toBeNull()
    expect(db.peso_kg).toBeNull()
    expect(db.fecha_estimada_entrega).toBeNull()
  })
})
