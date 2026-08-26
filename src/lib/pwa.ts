/**
 * Registro del service worker.
 *
 * Solo en producción: en desarrollo un SW cacheando el shell hace que los
 * cambios no se vean y se pierdan horas buscando un bug que no existe.
 */
export function registrarServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin SW la app sigue funcionando con red; no vale la pena molestar.
    })
  })
}
