/*
 * Service worker.
 *
 * Objetivo modesto y a propósito: que la app abra sin señal y muestre el
 * último estado cacheado. NO hay sincronización de escritura sin conexión —
 * si no hay red, el guardado falla con un mensaje claro (ver useConexion y
 * mensajeDeError), nunca en silencio.
 */

// Sube cuando cambie el contenido del shell. Al subir, `activate` tira los
// caches viejos y se reconstruye limpio — aquí cambió por las fuentes.
const VERSION = 'v2'
const CACHE_SHELL = `shell-${VERSION}`
const CACHE_DATOS = `datos-${VERSION}`

// El shell mínimo para que la app arranque sin red. Las fuentes entran
// aquí y no en el cache de paso: son parte de cómo se ve la app desde el
// primer fotograma, y esperar a que alguien las pida una vez con señal
// deja la primera visita sin señal con la letra del sistema.
const PRECARGA = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/iconos/icono-192.png',
  '/fuentes/inter-latin.woff2',
  '/fuentes/space-grotesk-latin.woff2',
]

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((c) => c.addAll(PRECARGA))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((llaves) =>
        Promise.all(
          llaves
            .filter((k) => k !== CACHE_SHELL && k !== CACHE_DATOS)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const req = evento.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Peticiones a Supabase: red primero, cache como red de seguridad.
  // Así los 3 ven datos frescos cuando hay señal, y algo cuando no.
  if (url.hostname.endsWith('.supabase.co')) {
    // Auth y realtime nunca se cachean.
    if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/realtime/')) return

    evento.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE_DATOS).then((c) => c.put(req, copia))
          return res
        })
        .catch(() => caches.match(req)),
    )
    return
  }

  // Navegación: la SPA siempre sirve index.html (rutas del router).
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }

  // Assets con hash de Vite: cache primero, son inmutables.
  evento.respondWith(
    caches.match(req).then(
      (enCache) =>
        enCache ||
        fetch(req).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copia = res.clone()
            caches.open(CACHE_SHELL).then((c) => c.put(req, copia))
          }
          return res
        }),
    ),
  )
})
