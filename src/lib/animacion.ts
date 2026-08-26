import type { Transition, Variants } from 'framer-motion'

/**
 * ══ VOCABULARIO DE MOVIMIENTO ═══════════════════════════════════════
 *
 * Un solo lugar. Antes la curva estaba copiada en doce archivos con
 * duraciones que iban de 0.18 a 0.35 según quién escribiera el
 * componente, y se notaba: dos cosas que aparecen juntas con ritmos
 * distintos se sienten como dos apps pegadas.
 *
 * ── La tesis del movimiento de esta app ────────────────────────────
 *
 * MOMENTO DE AUTOR: el hundido de arcilla. Todo lo que se puede apretar
 *   se comprime contra la mesa: encoge, pierde el apoyo y se le cierra
 *   la pared interior. Es UN gesto, repetido en cada control, y es lo
 *   que hace que la interfaz se sienta hecha de un material en vez de
 *   pintada. Vive en CSS (`.pulsable`), no aquí, porque corre fuera del
 *   hilo principal y porque tiene que funcionar aunque framer no haya
 *   cargado. Ver src/index.css.
 *
 * CONTINUIDAD: lo que se mueve de un sitio a otro no reaparece, VIAJA.
 *   El indicador del menú y el del segmentado son la misma pieza de
 *   barro deslizándose, con `layoutId` y resorte. Un elemento que se
 *   apaga en un lado y se enciende en otro obliga a buscarlo; uno que
 *   viaja se sigue solo con el ojo.
 *
 * ACUSE DE RECIBO: hojas, avisos y errores. Entran explicando de dónde
 *   vienen y salen más rápido de lo que entraron.
 *
 * PRESUPUESTO: nada de interfaz pasa de 300ms. Las dos únicas cosas más
 *   largas son entradas coreografiadas que ocurren una vez por pantalla
 *   (el trazado de una gráfica, el crecimiento de las barras), y las dos
 *   son decoración sobre un dibujo que ya está completo y correcto sin
 *   ellas.
 *
 * OJO: quien de verdad respeta "reducir movimiento" del sistema es el
 * <MotionConfig reducedMotion="user"> de main.tsx. El bloque de CSS de
 * index.css solo alcanza a las animaciones de CSS — framer escribe
 * estilos en línea desde JS y se le escapa por completo.
 */

/**
 * Salida rápida, frenado largo. Se siente ágil sin verse brusca.
 *
 * Es la ease-out fuerte que recomienda Emil Kowalski: las que trae CSS de
 * fábrica son demasiado flojas para que una animación se sienta
 * intencional.
 *
 * Su gemela en CSS es `--salida`, en estilos/arcilla.css. Las dos tienen
 * que decir los mismos cuatro números: son el mismo movimiento visto
 * desde los dos lados, y si se separan, una hoja que entra por CSS y una
 * tarjeta que entra por framer dejan de sentirse como la misma app.
 *
 * No se puede leer la variable desde aquí —framer necesita el arreglo de
 * números, no una cadena de CSS— así que la única defensa es esta nota.
 */
export const SALIDA = [0.23, 1, 0.32, 1] as const

/** Para lo que se mueve EN pantalla sin entrar ni salir. */
export const RECORRIDO = [0.77, 0, 0.175, 1] as const

export const DURACION = {
  /** Micro-respuestas: un error que aparece, un color que cambia. */
  rapida: 0.16,
  /** El default para casi todo: entradas de tarjeta, cambios de vista. */
  normal: 0.22,
  /** Recorridos largos: barras que se llenan, el asistente viajando. */
  lenta: 0.42,
} as const

export const transicion = (duracion: number = DURACION.normal): Transition => ({
  duration: duracion,
  ease: SALIDA,
})

/**
 * ── Los resortes ───────────────────────────────────────────────────
 *
 * Van en la forma de Apple (`duration` + `bounce`) y no en la física
 * cruda (`stiffness` + `damping`) porque se puede razonar sobre ella: se
 * lee cuánto tarda y cuánto rebota, que son las dos preguntas que uno
 * se hace. Con rigidez y amortiguación hay que simularlo mentalmente.
 *
 * El rebote va corto en todo. La arcilla es un material MATE Y PESADO:
 * no es goma. Un `bounce` alto la convierte en un globo y deshace de un
 * golpe todo lo que las sombras están construyendo.
 */

/** Para lo que se empuja: hojas, paneles que suben. */
export const RESORTE: Transition = { type: 'spring', duration: 0.42, bounce: 0.12 }

/** Para lo que VIAJA de un sitio a otro: indicadores de menú y filtros. */
export const RESORTE_VIAJE: Transition = { type: 'spring', duration: 0.38, bounce: 0.16 }

/** Más blando, para lo que aparece de la nada y no debe asustar. */
export const RESORTE_SUAVE: Transition = { type: 'spring', duration: 0.5, bounce: 0.1 }

/**
 * Retraso escalonado de una lista.
 *
 * Se topa a los 8 elementos: con 40 filas, escalonar todas hace que la
 * última entre casi dos segundos tarde y la lista se sienta trabada. El
 * escalonado es decoración — nunca bloquea la interacción.
 */
export const escalonar = (indice: number, paso = 0.03) => Math.min(indice, 8) * paso

/**
 * Entrada estándar.
 *
 * Sube 10px al aparecer y se va hacia arriba al salir. Nada arranca en
 * `scale(0)`: en el mundo real nada aparece de la nada, y una pieza que
 * nace del tamaño cero se ve salir de un punto en vez de acercarse.
 */
export const ENTRADA: Variants = {
  oculto: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  saliendo: { opacity: 0, y: -6, transition: { duration: DURACION.rapida, ease: SALIDA } },
}

/**
 * Entrada de una pieza de barro: además de subir, llega ligeramente
 * aplastada y se infla a su tamaño. Es el mismo gesto del hundido, al
 * revés — el objeto se despega de la mesa.
 *
 * `scale` arranca en 0.96, no en 0: alto suficiente para que se lea el
 * inflado, bajo suficiente para que la pieza ya tenga forma reconocible
 * desde el primer fotograma.
 */
export const ENTRADA_ARCILLA: Variants = {
  oculto: { opacity: 0, y: 12, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  saliendo: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: DURACION.rapida, ease: SALIDA },
  },
}

/** Solo opacidad, para cruces de contenido donde el desplazamiento estorba. */
export const FUNDIDO: Variants = {
  oculto: { opacity: 0 },
  visible: { opacity: 1 },
  saliendo: { opacity: 0 },
}

/** Lo que se colapsa hacia arriba: mensajes de error, avisos condicionales. */
export const DESPLEGAR: Variants = {
  oculto: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
  saliendo: { opacity: 0, height: 0 },
}
