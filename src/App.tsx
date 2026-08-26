import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useRol } from './hooks/useRol'
import { useRealtime } from './hooks/useRealtime'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
import { Leads } from './pages/Leads'
import { Trabajos } from './pages/Trabajos'
import { TrabajoDetalle } from './pages/TrabajoDetalle'
import { Catalogo } from './pages/Catalogo'
import { Contenido } from './pages/Contenido'
import { Config } from './pages/Config'
import { Skeleton } from './components/ui/Estados'
import { Button } from './components/ui/Button'

// Dashboard y Pauta son las únicas que cargan Recharts (~400 kB). Se traen
// aparte para que la captura diaria no pague por las gráficas.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Ads = lazy(() => import('./pages/Ads').then((m) => ({ default: m.Ads })))
const CampanaDetalle = lazy(() =>
  import('./pages/CampanaDetalle').then((m) => ({ default: m.CampanaDetalle })),
)

function Arrancando() {
  return (
    <div className="min-h-dvh bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="mt-8 h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-12 w-full" />
        {/* Sin esto, una carga atorada se ve idéntica a una pantalla en negro
            y no hay forma de saber si la app está viva. */}
        <p className="pt-2 text-center text-sm text-fg-subtle">Cargando…</p>
      </div>
    </div>
  )
}

function PerfilNoDisponible({
  mensaje,
  onReintentar,
  onSalir,
}: {
  mensaje: string
  onReintentar: () => void
  onSalir: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Entraste, pero…</h1>
        <p className="mt-2 text-base text-fg-muted">{mensaje}</p>
        <div className="mt-6 space-y-2">
          <Button bloque tamano="lg" onClick={onReintentar}>
            Reintentar
          </Button>
          <Button bloque tamano="lg" variante="secundario" onClick={onSalir}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Config es solo de admin. La ruta lo refleja; RLS lo hace valer. */
function SoloAdmin({ children }: { children: React.ReactNode }) {
  const { esAdmin } = useRol()
  return esAdmin ? <>{children}</> : <Navigate to="/" replace />
}

export function App() {
  const { session, perfil, cargando, cargandoPerfil, errorPerfil, reintentarPerfil, salir } =
    useAuth()

  // Realtime solo con sesión: sin JWT el canal no pasa RLS.
  useRealtime(Boolean(session))

  if (cargando) return <Arrancando />
  if (!session) return <Login />

  // Hay sesión pero el perfil no llegó. Antes esto se quedaba en la pantalla
  // de carga para siempre y se veía como una pantalla negra vacía.
  if (!perfil) {
    if (cargandoPerfil) return <Arrancando />

    return (
      <PerfilNoDisponible
        mensaje={errorPerfil ?? 'No se pudo cargar tu perfil.'}
        onReintentar={reintentarPerfil}
        onSalir={() => void salir()}
      />
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
<Dashboard />
          }
        />
        <Route path="leads" element={<Leads />} />
        <Route path="trabajos" element={<Trabajos />} />
        <Route path="trabajos/:id" element={<TrabajoDetalle />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="contenido" element={<Contenido />} />
        <Route
          path="ads"
          element={
<Ads />
          }
        />
        <Route
          path="ads/:id"
          element={
<CampanaDetalle />
          }
        />
        <Route
          path="config"
          element={
            <SoloAdmin>
              <Config />
            </SoloAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
