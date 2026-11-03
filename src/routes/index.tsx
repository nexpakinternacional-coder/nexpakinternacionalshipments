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

export const router = createBrowserRouter([
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
