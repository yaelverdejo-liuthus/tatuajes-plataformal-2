import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { DURACION, SALIDA } from '../../lib/animacion'

/**
 * Panel anclado a un disparador. Lo usan el selector de fecha y el de hora.
 *
 * Va por PORTAL y con posición fija, no dentro del flujo. Los formularios
 * de esta app viven dentro de `<Sheet>`, que tiene `overflow-y-auto` para
 * poder desplazarse: un panel colocado ahí adentro quedaría recortado por
 * el borde de la hoja justo cuando se abre cerca del final, que es donde
 * suelen estar los campos de fecha.
 *
 * Se recoloca al desplazar y al cambiar el tamaño, porque estando fijo no
 * viaja solo con su disparador.
 */

const MARGEN = 8
const SEPARACION = 6

interface Caja {
  arriba: number
  izquierda: number
  /** De dónde crece el panel al abrirse, para que salga de su disparador. */
  origen: string
  /** Tope de alto según el hueco disponible. Si sobra contenido, se desplaza
      dentro del panel en vez de salirse de la ventana. */
  maxAlto: number
}

export function Popover({
  abierto,
  onCerrar,
  disparador,
  ancho = 300,
  etiqueta,
  children,
}: {
  abierto: boolean
  onCerrar: () => void
  /** El elemento al que se ancla. */
  disparador: HTMLElement | null
  ancho?: number
  etiqueta: string
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [caja, setCaja] = useState<Caja | null>(null)

  /* El mismo corte que usa `sm:` en Tailwind, para que el cambio de forma
     coincida con el resto de la app y no ocurra en un ancho propio. */
  const [angosta, setAngosta] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const alCambiar = () => setAngosta(mq.matches)
    alCambiar()
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  /*
   * Se mide en useLayoutEffect y no en useEffect: entre pintar el panel en
   * una posición provisional y corregirla hay un fotograma, y en ese
   * fotograma el panel se ve saltar desde la esquina superior izquierda.
   */
  useLayoutEffect(() => {
    // En hoja de abajo no hay nada que anclar: la posición la fija el CSS.
    if (!abierto || !disparador || angosta) return

    const colocar = () => {
      const d = disparador.getBoundingClientRect()
      const alto = panel.current?.offsetHeight ?? 320
      const vw = window.innerWidth
      const vh = window.innerHeight
      const anchoReal = Math.min(ancho, vw - MARGEN * 2)

      const huecoDebajo = vh - d.bottom - SEPARACION - MARGEN
      const huecoEncima = d.top - SEPARACION - MARGEN

      // Alineado al campo, pero sin salirse por ningún lado.
      const alineado = Math.min(Math.max(d.left, MARGEN), vw - anchoReal - MARGEN)
      const pico = Math.min(Math.max(d.left + d.width / 2 - alineado, 12), anchoReal - 12)

      if (alto <= huecoDebajo) {
        // Lo normal: colgando del campo.
        setCaja({ arriba: d.bottom + SEPARACION, izquierda: alineado, origen: `${pico}px 0%`, maxAlto: huecoDebajo })
        return
      }
      if (alto <= huecoEncima) {
        setCaja({ arriba: d.top - SEPARACION - alto, izquierda: alineado, origen: `${pico}px 100%`, maxAlto: huecoEncima })
        return
      }

      /*
       * No cabe ni arriba ni abajo. Antes esto se resolvía pegando el panel
       * al tope de la ventana, y el resultado era que TAPABA el propio campo
       * que se estaba editando: elegías una fecha sin poder ver el campo que
       * iba a recibirla.
       *
       * Pasa de verdad y no es un caso raro: en pantallas de portátil de
       * 585 px útiles, con el campo a media hoja, un calendario de seis
       * filas no cabe por ningún lado.
       *
       * Se pone AL LADO, que es lo que hace cualquier calendario de
       * escritorio cuando se queda sin alto. El campo permanece visible y
       * el panel se topa al alto de la ventana por si aun así sobra.
       */
      const cabeIzquierda = d.left - SEPARACION - MARGEN >= anchoReal
      const izquierda = cabeIzquierda
        ? d.left - SEPARACION - anchoReal
        : Math.min(d.right + SEPARACION, vw - anchoReal - MARGEN)

      const arriba = Math.min(Math.max(MARGEN, d.top - alto / 2 + d.height / 2), vh - alto - MARGEN)

      setCaja({
        arriba: Math.max(MARGEN, arriba),
        izquierda,
        origen: `${cabeIzquierda ? '100%' : '0%'} ${Math.min(Math.max(d.top + d.height / 2 - arriba, 12), alto - 12)}px`,
        maxAlto: vh - MARGEN * 2,
      })
    }

    colocar()
    // `capture` para enterarse también del scroll de la hoja, que no
    // burbujea hasta window.
    window.addEventListener('scroll', colocar, true)
    window.addEventListener('resize', colocar)
    return () => {
      window.removeEventListener('scroll', colocar, true)
      window.removeEventListener('resize', colocar)
    }
  }, [abierto, disparador, ancho, angosta])

  useEffect(() => {
    if (!abierto) return

    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCerrar()
      }
    }
    const alApuntar = (e: PointerEvent) => {
      const t = e.target as Node
      if (panel.current?.contains(t) || disparador?.contains(t)) return
      onCerrar()
    }

    // En captura y no en burbujeo: el Sheet también escucha Escape para
    // cerrarse, y sin esto una sola tecla cerraba el panel Y la hoja.
    window.addEventListener('keydown', alTeclado, true)
    window.addEventListener('pointerdown', alApuntar, true)
    return () => {
      window.removeEventListener('keydown', alTeclado, true)
      window.removeEventListener('pointerdown', alApuntar, true)
    }
  }, [abierto, onCerrar, disparador])

  /*
   * En pantalla angosta esto NO se ancla: se vuelve una hoja de abajo.
   *
   * Anclarlo era imposible y está medido: un calendario de 312 px en una
   * ventana de 390 no cabe ni al lado del campo ni encima ni debajo, así
   * que terminaba tapando justo el campo que se estaba editando. No es un
   * problema de cálculo, es que no hay hueco.
   *
   * Una hoja de abajo sí cabe siempre, es el gesto que ya usa el resto de
   * la app para los formularios, y deja el pulgar cerca de los días — que
   * en un teléfono es donde tienen que estar.
   */
  if (angosta) {
    return createPortal(
      <AnimatePresence>
        {abierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onCerrar}
              className="fixed inset-0 z-[79] bg-black/50"
            />
            <motion.div
              ref={panel}
              role="dialog"
              aria-label={etiqueta}
              /* Sube desde su propio alto, sea el que sea. Resorte porque
                 es una superficie que se empuja, como el Sheet. */
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%', transition: { duration: 0.15, ease: SALIDA } }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="safe-bottom fixed inset-x-0 bottom-0 z-[80] flex max-h-[80dvh] flex-col overflow-y-auto overscroll-contain rounded-t-4xl bg-surface shadow-hoja"
            >
              <div className="flex justify-center pt-2.5">
                <div className="pozo h-1.5 w-10 rounded-full" />
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body,
    )
  }

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-label={etiqueta}
          /* Desde 0.96, nunca desde 0: nada aparece de la nada. Y la
             salida más rápida que la entrada. */
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1, ease: SALIDA } }}
          transition={{ duration: DURACION.rapida, ease: SALIDA }}
          style={{
            position: 'fixed',
            top: caja?.arriba ?? -9999,
            left: caja?.izquierda ?? -9999,
            width: Math.min(ancho, window.innerWidth - MARGEN * 2),
            maxHeight: caja?.maxAlto,
            transformOrigin: caja?.origen ?? 'center',
          }}
          className="z-[80] flex flex-col overflow-y-auto overscroll-contain rounded-2xl bg-surface shadow-arcilla-alta"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
