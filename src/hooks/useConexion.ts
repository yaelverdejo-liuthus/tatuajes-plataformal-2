import { useEffect, useState } from 'react'

/**
 * Estado de conexión. En el estudio se cae la señal seguido, y el usuario
 * tiene que saber qué pasa con lo que está capturando — nunca fallar en
 * silencio (§3.2 del brief).
 */
export function useConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine)

  useEffect(() => {
    const subir = () => setEnLinea(true)
    const bajar = () => setEnLinea(false)
    window.addEventListener('online', subir)
    window.addEventListener('offline', bajar)
    return () => {
      window.removeEventListener('online', subir)
      window.removeEventListener('offline', bajar)
    }
  }, [])

  return enLinea
}
