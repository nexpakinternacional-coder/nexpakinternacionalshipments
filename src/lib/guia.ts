export const ALFABETO = 'ABCDEFGHJKMNPQRTUVWXYZ2346789'
export const PREFIJO = 'NXP'

export function calcularVerificador(chars6: string): string {
  let suma = 0
  for (let i = 0; i < 6; i++) {
    suma += (i + 1) * ALFABETO.indexOf(chars6[i])
  }
  return ALFABETO[suma % 29]
}

export function normalizarGuia(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export function validarGuia(input: string): boolean {
  const guia = normalizarGuia(input)
  if (!guia.startsWith(PREFIJO)) return false
  const cuerpo = guia.slice(PREFIJO.length)
  if (cuerpo.length !== 7) return false
  for (const c of cuerpo) {
    if (!ALFABETO.includes(c)) return false
  }
  return calcularVerificador(cuerpo.slice(0, 6)) === cuerpo[6]
}

export function formatearGuia(guia: string): string {
  const normalizada = normalizarGuia(guia)
  return `${normalizada.slice(0, 3)}-${normalizada.slice(3)}`
}
