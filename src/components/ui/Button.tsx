import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

/*
 * ── Por qué esto ya no es un <motion.button> ──────────────────────────
 *
 * Antes el hundido lo hacía framer con `whileTap={{ scale: 0.97 }}`.
 * Ahora lo hace la clase `.pulsable` en CSS, y el botón es un `<button>`
 * pelado. Tres razones, en orden de peso:
 *
 *  1. El hundido de arcilla no es solo escala: también cambia la sombra.
 *     Framer tendría que animar `boxShadow` interpolando cinco capas
 *     entre dos valores que además dependen del tema. En CSS es un
 *     cambio de variable y el navegador se encarga.
 *
 *  2. Las animaciones de CSS corren fuera del hilo principal. Este botón
 *     se aprieta justo cuando la app está guardando algo — o sea cuando
 *     el hilo está más ocupado. Framer usa requestAnimationFrame y ahí
 *     es cuando pierde fotogramas; CSS no se entera.
 *
 *  3. Es el control más repetido de la app. Quitarle el runtime de
 *     framer a cada botón quita una capa de trabajo por render en todas
 *     las listas.
 *
 * El acuse de recibo al toque no se negocia: es lo único que confirma en
 * un teléfono que la interfaz escuchó. Lo que cambió es quién lo dibuja.
 */

const VARIANTES: Record<Variante, string> = {
  /*
   * La pieza de color pleno. El filo de luz va más fuerte que en las
   * demás porque sobre un violeta saturado un 12% de blanco no se ve; y
   * la pared interior va teñida de negro, no de violeta oscuro, para que
   * el barro no se vea translúcido.
   */
  primario:
    'bg-primary text-primary-fg shadow-arcilla hover:bg-primary-hover ' +
    'disabled:bg-primary/40 disabled:shadow-arcilla-sutil',
  secundario:
    'bg-surface-2 text-fg shadow-arcilla hover:bg-surface-3',
  /*
   * La única variante SIN cuerpo: es texto hasta que la tocas. Existe
   * para las acciones terciarias, donde una pieza de barro más sería
   * ruido. Al pasar el cursor sale del fondo y se vuelve barro.
   */
  fantasma:
    'text-fg-muted hover:bg-surface-2 hover:text-fg hover:shadow-arcilla-sutil',
  peligro:
    'bg-danger/15 text-danger shadow-arcilla-sutil hover:bg-danger/22',
}

// 44px mínimo de área táctil en md y lg (§3.1 del brief)
const TAMANOS: Record<Tamano, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4.5 text-base rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-2xl gap-2 font-semibold',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  bloque?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variante = 'primario',
    tamano = 'md',
    cargando,
    bloque,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      className={cn(
        'pulsable inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        // El color va aparte del hundido: `.pulsable` ya nombra transform
        // y box-shadow, y aquí se suma el color sin pisarlas.
        '[transition-property:transform,box-shadow,background-color,color] duration-toque ease-salida',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante],
        TAMANOS[tamano],
        bloque && 'w-full',
        className,
      )}
      {...props}
    >
      {cargando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

/**
 * Botón redondo flotante para el alta rápida en móvil.
 *
 * Y solo en móvil, que es lo que este comentario decía desde el principio
 * mientras el estilo lo dibujaba también en escritorio. Ahí no aportaba
 * nada: las cinco pantallas que lo usan ya llevan el mismo alta en el
 * encabezado, así que era un segundo botón para la misma acción y encima
 * tapaba la última fila de la lista.
 *
 * En móvil sí se queda: no hay encabezado fijo y el pulgar no llega arriba.
 *
 * Lleva `arcilla-alta`, el peldaño más alto de la escalera, porque es la
 * única pieza de la app que de verdad FLOTA sobre el contenido en vez de
 * apoyarse en él. La sombra larga es lo que lo despega.
 *
 * Sin animación de entrada, a propósito. Entraba con un resorte y, como
 * vive dentro de cada pantalla, se desmontaba y volvía a montar en CADA
 * cambio de sección: el mismo botón, en el mismo sitio, repitiendo su
 * aparición cinco veces por minuto. La regla es la frecuencia — algo que
 * se ve decenas de veces al día no se presenta. Ya estaba ahí antes de
 * cambiar de sección y sigue ahí después.
 *
 * El tutorial no se rompe al esconderlo. `buscarVisible` elige, entre los
 * duplicados responsive, el que tenga `offsetWidth > 0`; por eso el alta del
 * encabezado lleva el mismo `data-tour` y el foco cae en el que se ve.
 */
export function BotonFlotante({
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        'pulsable fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30',
        'flex h-14 w-14 items-center justify-center rounded-3xl',
        'bg-primary text-primary-fg shadow-arcilla-alta',
        'md:hidden',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
