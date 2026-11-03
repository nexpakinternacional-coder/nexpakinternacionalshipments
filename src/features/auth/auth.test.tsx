// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

type AuthCb = (event: string, session: unknown) => void

const authCbRef = vi.hoisted<{ current: AuthCb | null }>(() => ({ current: null }))
const singleFn = vi.hoisted(() => vi.fn())
const signOutFn = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCb) => {
        authCbRef.current = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      signOut: signOutFn,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: singleFn }),
      }),
    }),
  },
}))

import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'

// ──────────────────────────────────────────────────

const SESION = {
  user: { id: 'uid-1' },
  access_token: 'tok',
  refresh_token: 'ref',
  expires_in: 3600,
  token_type: 'bearer',
}

const PERFIL_ACTIVO = {
  id: 'uid-1',
  nombre: 'Admin Test',
  rol: 'admin' as const,
  activo: true,
}

function Wrapper() {
  return (
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          element={
            <AuthProvider>
              <ProtectedRoute />
            </AuthProvider>
          }
        >
          <Route path="/admin" element={<div>Panel de admin</div>} />
        </Route>
        <Route path="/admin/login" element={<div>Página de login</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  authCbRef.current = null
  singleFn.mockReset()
  signOutFn.mockResolvedValue({ error: null })
})

afterEach(() => {
  cleanup()
})

// ──────────────────────────────────────────────────

describe('autorización de acceso al panel', () => {
  it('1. login con perfil admin activo → accede al panel', async () => {
    singleFn.mockResolvedValue({ data: PERFIL_ACTIVO, error: null })
    render(<Wrapper />)

    await act(async () => {
      authCbRef.current?.('SIGNED_IN', SESION)
    })

    await waitFor(() => {
      expect(screen.getByText('Panel de admin')).toBeDefined()
    })
  })

  it('2. perfil con activo = false → pantalla sin acceso, sin cerrar sesión automáticamente', async () => {
    singleFn.mockResolvedValue({ data: { ...PERFIL_ACTIVO, activo: false }, error: null })
    render(<Wrapper />)

    await act(async () => {
      authCbRef.current?.('SIGNED_IN', SESION)
    })

    await waitFor(() => {
      expect(screen.getByText(/no tiene acceso/i)).toBeDefined()
    })
    expect(signOutFn).not.toHaveBeenCalled()
  })

  it('3. error al consultar el perfil → pantalla de error con botón Reintentar, sin cerrar sesión', async () => {
    singleFn.mockResolvedValue({ data: null, error: { message: 'network error' } })
    render(<Wrapper />)

    await act(async () => {
      authCbRef.current?.('SIGNED_IN', SESION)
    })

    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar/i)).toBeDefined()
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeDefined()
    })
    expect(signOutFn).not.toHaveBeenCalled()
  })

  it('4. TOKEN_REFRESHED del mismo usuario → no recarga el perfil', async () => {
    singleFn.mockResolvedValue({ data: PERFIL_ACTIVO, error: null })
    render(<Wrapper />)

    await act(async () => {
      authCbRef.current?.('SIGNED_IN', SESION)
    })
    await waitFor(() => {
      expect(screen.getByText('Panel de admin')).toBeDefined()
    })

    const callsBefore = singleFn.mock.calls.length

    await act(async () => {
      authCbRef.current?.('TOKEN_REFRESHED', SESION)
      await new Promise(r => setTimeout(r, 20))
    })

    expect(singleFn.mock.calls.length).toBe(callsBefore)
  })

  it('5. perfil tarda en cargar → spinner visible, nunca pantalla de sin acceso', async () => {
    let resolvePerfil!: (v: { data: typeof PERFIL_ACTIVO; error: null }) => void
    singleFn.mockReturnValue(
      new Promise<{ data: typeof PERFIL_ACTIVO; error: null }>(res => {
        resolvePerfil = res
      }),
    )

    render(<Wrapper />)

    await act(async () => {
      authCbRef.current?.('SIGNED_IN', SESION)
      // Da tiempo al setTimeout(0) de cargarPerfil para que se ejecute
      await new Promise(r => setTimeout(r, 0))
    })

    expect(screen.getByText(/cargando/i)).toBeDefined()
    expect(screen.queryByText(/no tiene acceso/i)).toBeNull()
    expect(singleFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePerfil({ data: PERFIL_ACTIVO, error: null })
    })

    await waitFor(() => {
      expect(screen.getByText('Panel de admin')).toBeDefined()
    })
  })
})
