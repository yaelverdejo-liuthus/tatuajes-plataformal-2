import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registrarServiceWorker } from './lib/pwa'
import './index.css'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // En el estudio la señal se cae: mejor mostrar lo cacheado que un error.
      staleTime: 30 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
})

// Modo oscuro por defecto, antes del primer render, para no parpadear.
const temaGuardado = localStorage.getItem('tatuajes:tema')
document.documentElement.classList.add(temaGuardado === 'light' ? 'light' : 'dark')

registrarServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/*
        reducedMotion="user" respeta el "reducir movimiento" del sistema en
        TODA la app. El bloque equivalente de index.css no alcanzaba a
        framer, que anima escribiendo estilos en línea desde JS: quien
        tuviera la opción activada seguía viendo todo moverse igual.
        Framer conserva los cambios de opacidad y apaga los de posición y
        escala, que son los que marean.
      */}
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={qc}>
          <BrowserRouter>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
)
