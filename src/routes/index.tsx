import { createBrowserRouter } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import AdminLayout from '../layouts/AdminLayout'
import ProtectedRoute from '../features/auth/ProtectedRoute'
import InicioPage from '../features/rastreo/InicioPage'
import RastreoPage from '../features/rastreo/RastreoPage'
import NotFoundPage from '../features/rastreo/NotFoundPage'
import LoginPage from '../features/auth/LoginPage'
import DashboardPage from '../features/auth/DashboardPage'
import EnviosPage from '../features/envios/EnviosPage'
import NuevoEnvioPage from '../features/envios/NuevoEnvioPage'
import DetalleEnvioPage from '../features/envios/DetalleEnvioPage'
import MarcaPage from '../features/dev/MarcaPage'

// Rutas de diagnóstico visual — solo en desarrollo, no llegan al build de producción
const rutasDev = import.meta.env.DEV
  ? [
      {
        element: <AdminLayout />,
        children: [
          { path: '/dev/layout', element: <NuevoEnvioPage /> },
        ],
      },
      {
        element: <PublicLayout />,
        children: [
          { path: '/dev/marca', element: <MarcaPage /> },
        ],
      },
    ]
  : []

export const router = createBrowserRouter([
  ...rutasDev,
  {
    element: <PublicLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { path: '/', element: <InicioPage /> },
      { path: '/rastreo/:guia', element: <RastreoPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <LoginPage />,
    errorElement: <NotFoundPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <DashboardPage /> },
          { path: '/admin/envios', element: <EnviosPage /> },
          { path: '/admin/envios/nuevo', element: <NuevoEnvioPage /> },
          { path: '/admin/envios/:id', element: <DetalleEnvioPage /> },
        ],
      },
    ],
  },
])
