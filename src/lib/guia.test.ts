import { describe, it, expect } from 'vitest'
import {
  ALFABETO,
  calcularVerificador,
  normalizarGuia,
  validarGuia,
  formatearGuia,
} from './guia'

describe('ALFABETO', () => {
  it('tiene exactamente 29 caracteres', () => {
    expect(ALFABETO.length).toBe(29)
  })
  it('no contiene caracteres confusos (0, O, 1, I, L, 5, S)', () => {
    for (const c of '0O1IL5S') {
      expect(ALFABETO.includes(c)).toBe(false)
    }
  })
})

describe('calcularVerificador', () => {
  it('AAAAAA → A  (suma ponderada = 0, índice 0)', () => {
    expect(calcularVerificador('AAAAAA')).toBe('A')
  })
  it('ABCDEF → P  (suma = 70, 70 % 29 = 12, índice 12 = P)', () => {
    expect(calcularVerificador('ABCDEF')).toBe('P')
  })
})

describe('normalizarGuia', () => {
  it('convierte a mayúsculas', () => {
    expect(normalizarGuia('nxpabcdefp')).toBe('NXPABCDEFP')
  })
  it('elimina guiones y espacios', () => {
    expect(normalizarGuia('NXP-ABCDEF P')).toBe('NXPABCDEFP')
  })
})

describe('validarGuia', () => {
  it('acepta NXPAAAAAAA (verificador A)', () => {
    expect(validarGuia('NXPAAAAAAA')).toBe(true)
  })
  it('acepta con formato visual NXP-AAAAAAA', () => {
    expect(validarGuia('NXP-AAAAAAA')).toBe(true)
  })
  it('acepta NXPABCDEFP (verificador P)', () => {
    expect(validarGuia('NXPABCDEFP')).toBe(true)
  })
  it('normaliza minúsculas antes de validar', () => {
    expect(validarGuia('nxp-aaaaaaa')).toBe(true)
  })
  it('rechaza verificador incorrecto', () => {
    expect(validarGuia('NXPABCDEFQ')).toBe(false)
  })
  it('rechaza sin prefijo NXP', () => {
    expect(validarGuia('ABCABCDEFP')).toBe(false)
  })
  it('rechaza carácter fuera del alfabeto (0)', () => {
    expect(validarGuia('NXP0ABCDX')).toBe(false)
  })
  it('rechaza longitud incorrecta', () => {
    expect(validarGuia('NXPABC')).toBe(false)
  })
})

describe('formatearGuia', () => {
  it('agrega el guion de presentación', () => {
    expect(formatearGuia('NXPAAAAAAA')).toBe('NXP-AAAAAAA')
  })
  it('es idempotente si ya tiene guion', () => {
    expect(formatearGuia('NXP-AAAAAAA')).toBe('NXP-AAAAAAA')
  })
})
