/**
 * Precarga de las rutas que van en su propio archivo.
 *
 * Tablero y Pauta son las únicas que cargan Recharts (~400 kB) y por eso
 * viven en un chunk aparte: la captura diaria no debe pagar por unas
 * gráficas que casi nadie abre. Esa decisión es buena y se queda.
 *
 * El problema no era esa decisión, era CUÁNDO se pide el archivo. Se pedía
 * al hacer clic, así que cambiar de sección se veía así:
 *
 *     0ms   clic
 *   120ms   nada todavía
 *   120ms   aparecen doce esqueletos con forma de rejilla de KPIs
 *   281ms   se van y llega el contenido real
 *
 * Un placeholder que vive 160 ms no informa de nada: es un parpadeo. Y
 * encima tenía la forma equivocada — Pauta no es una rejilla de KPIs— así
 * que lo que se veía era un salto entre dos maquetas distintas.
 *
 * Aquí se pide el archivo cuando aparece la INTENCIÓN de ir, no el hecho:
 * el cursor entrando al enlace, el foco del teclado llegando, o el dedo
 * tocando antes de soltar. Entre esa señal y el clic pasan entre 100 y 400
 * ms, que es justo lo que costaba la espera. El archivo llega antes que el
 * clic, Suspense nunca suspende y el esqueleto no llega a existir.
 *
 * Y no traiciona la decisión original: sigue sin bajarse solo. Solo lo paga
 * quien demuestra que va para allá.
 */

/**
 * El `import()` es el mismo que usa el `lazy()` de App.tsx. Llamarlo dos
 * veces no descarga dos veces: el registro de módulos devuelve el que ya
 * está, así que esto solo adelanta el trabajo que iba a hacerse igual.
 */
const IMPORTACIONES: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Dashboard'),
  '/ads': () => import('../pages/Ads'),
}

/** Una sola vez por ruta: pasar el cursor tres veces no pide tres archivos. */
const yaPedidas = new Set<string>()

export function precargarRuta(ruta: string) {
  const importar = IMPORTACIONES[ruta]
  if (!importar || yaPedidas.has(ruta)) return
  yaPedidas.add(ruta)
  // Si falla, no se avisa: era una apuesta a que el usuario iba a ir. El
  // clic de verdad volverá a intentarlo y ahí sí hay a quién reportarle.
  void importar().catch(() => yaPedidas.delete(ruta))
}

/**
 * Los tres gestos que anuncian la intención, listos para untar sobre un
 * enlace. `onTouchStart` es el que salva al teléfono: en táctil no hay
 * cursor que pase por encima, y entre tocar y soltar hay ~100 ms.
 */
export const precargaAl = (ruta: string) => ({
  onMouseEnter: () => precargarRuta(ruta),
  onFocus: () => precargarRuta(ruta),
  onTouchStart: () => precargarRuta(ruta),
})
