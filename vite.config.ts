import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // MapLibre instancia workers con una URL relativa que Vite rompe al pre-bundlear.
    // Al excluirlo, el browser lo carga directamente y el worker URL se resuelve bien.
    exclude: ['maplibre-gl'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
