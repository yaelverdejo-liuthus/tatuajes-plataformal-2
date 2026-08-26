import { useEffect, useRef, useState } from 'react'

/**
 * Para los bucles decorativos cuando nadie los está viendo.
 *
 * ── Por qué existe ────────────────────────────────────────────────────
 *
 * Esta app tiene dos capas que se animan sin parar: la lluvia de calaveras
 * del login y la de billetes de los KPI. En el Tablero hay SIETE tarjetas
 * con semáforo, o sea siete lluvias corriendo a la vez, y en una pantalla
 * de teléfono solo se ven dos o tres al mismo tiempo. Las otras cuatro
 * siguen componiendo fotogramas para nadie.
 *
 * Y si el estudio deja la pestaña abierta en el fondo —que es lo normal,
 * la app vive abierta todo el día— siguen corriendo las siete.
 *
 * Es batería quemada a cambio de cero. La regla es simple: un bucle que no
 * transporta información no tiene por qué correr cuando no se ve.
 *
 * ── Cómo lo hace ──────────────────────────────────────────────────────
 *
 * Devuelve un `ref` para el contenedor y el valor del atributo
 * `data-quieto`. El CSS de index.css hace el resto con una sola regla:
 *
 *     [data-quieto='si'] * { animation-play-state: paused }
 *
 * `paused` y no `none`: la animación conserva su posición y al volver
 * sigue desde donde iba. Con `none` los billetes saltarían todos al inicio
 * cada vez que la tarjeta vuelve a entrar en pantalla, que se vería peor
 * que no pararlos.
 *
 * Dos señales, porque son dos casos distintos:
 *
 *  · IntersectionObserver → la tarjeta salió del viewport al hacer scroll.
 *  · visibilitychange     → la pestaña se fue al fondo. Ahí el observer no
 *                           dispara nada: los elementos siguen "visibles"
 *                           en el layout aunque nadie los mire.
 *
 * El margen de 200px hace que vuelva a arrancar un poco ANTES de entrar en
 * pantalla. Sin él, la lluvia arrancaba justo en el borde y se veía el
 * primer fotograma aparecer de golpe.
 */
export function useQuieto<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [enPantalla, setEnPantalla] = useState(true)
  const [pestanaVisible, setPestanaVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || typeof IntersectionObserver === 'undefined') return

    const observador = new IntersectionObserver(
      ([entrada]) => setEnPantalla(entrada.isIntersecting),
      { rootMargin: '200px' },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    const alCambiar = () => setPestanaVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', alCambiar)
    return () => document.removeEventListener('visibilitychange', alCambiar)
  }, [])

  return {
    ref,
    /* Se escribe siempre, con 'si' o 'no'. Un atributo que aparece y
       desaparece obliga a React a tocar el DOM dos veces por cambio; uno
       que solo cambia de valor, una. */
    quieto: enPantalla && pestanaVisible ? ('no' as const) : ('si' as const),
  }
}
