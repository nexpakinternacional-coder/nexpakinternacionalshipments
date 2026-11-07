import { z } from 'zod'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { ConfiguracionProvider } from './hooks/useConfiguracionSitio'
import { router } from './routes'
import './index.css'

// Mensajes de validación de Zod en español de forma global
z.config(z.locales.es())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfiguracionProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfiguracionProvider>
  </StrictMode>,
)
