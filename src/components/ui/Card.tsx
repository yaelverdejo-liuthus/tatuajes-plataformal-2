import type { HTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ENTRADA_ARCILLA, escalonar, transicion } from '../../lib/animacion'
import { cn } from '../../lib/cn'

/**
 * La pieza de barro base.
 *
 * Ya no lleva `border`. Es el cambio de una línea que más se nota en todo
 * el rediseño: el borde de 1px era lo que dibujaba la tarjeta, y mientras
 * exista, la sombra no tiene nada que hacer — el ojo lee el contorno duro
 * y deja de leer el volumen. Un objeto de barro no tiene contorno; tiene
 * un canto iluminado arriba y una pared en sombra abajo, y las dos cosas
 * viven dentro de `.arcilla`.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('arcilla rounded-2xl p-4', className)} {...props} />
}

/**
 * Card de lista: entra escalonada y sale encogiéndose.
 *
 * La entrada usa ENTRADA_ARCILLA, que además de subir INFLA la pieza desde
 * 0.96. Es el hundido al revés: el objeto se despega de la mesa. Con solo
 * opacidad y desplazamiento, una lista de tarjetas de barro entra como una
 * lista de rectángulos y se pierde justo el material que se acaba de
 * construir.
 *
 * Antes solo tenía entrada. Como las listas ya venían envueltas en
 * <AnimatePresence>, borrar un registro lo hacía desaparecer de golpe —
 * se veía como un parpadeo, no como un borrado. `exit` arregla esa mitad.
 *
 * La otra mitad (que las de abajo suban con suavidad al hueco) pedía
 * `layout`, y eso se quitó: obliga a framer a medir la posición real de
 * cada tarjeta y aplicarle un transform. Dentro de una página que a su vez
 * está animándose, la medición salía contra un ancestro en movimiento y
 * dejaba tarjetas desplazadas fuera de la pantalla. Que las filas den un
 * salto seco al reacomodarse es mucho menos grave que no verlas.
 */
export function CardAnimada({
  indice = 0,
  className,
  children,
  onClick,
}: {
  indice?: number
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  const pulsable = Boolean(onClick)

  return (
    <motion.div
      variants={ENTRADA_ARCILLA}
      initial="oculto"
      animate="visible"
      exit="saliendo"
      transition={{ ...transicion(), delay: escalonar(indice) }}
      onClick={onClick}
      className={cn(
        'arcilla rounded-2xl p-4',
        /*
         * El hundido lo pone CSS, igual que en Button y por las mismas
         * razones. Aquí importa todavía más: en una lista larga hay
         * treinta de estas, y treinta suscripciones de framer a un
         * gesto de toque es trabajo que el teléfono no tiene por qué
         * hacer para dibujar un encogido del 2.5%.
         */
        pulsable &&
          'pulsable cursor-pointer [transition-property:transform,box-shadow,background-color] duration-toque ease-salida hover:bg-surface-2',
        className,
      )}
      /*
       * Aquí NO va `role="button"` ni `tabIndex`, y es deliberado.
       *
       * Estas tarjetas llevan dentro un enlace (el globo de WhatsApp).
       * Un contenedor con `role="button"` que contiene un enlace es
       * anidamiento inválido: el lector de pantalla anuncia el bloque
       * entero como un único botón —nombre kilométrico incluido— y según
       * cuál sea, el enlace de dentro deja de poder alcanzarse.
       *
       * El acceso por teclado lo resuelve el pie de la tarjeta, que en
       * Leads y en Trabajos es un `<button>` de verdad con el texto de la
       * acción ("Ver más detalles", "Ver expediente completo"). Un
       * control real y nombrado, en vez de un div fingiendo ser botón.
       */
    >
      {children}
    </motion.div>
  )
}

/**
 * El rótulo de una sección.
 *
 * Va en versalitas anchas y en `fg-subtle`: es señalización, no
 * contenido. Lo que tiene que leerse es lo que hay debajo.
 *
 * La regla de espaciado del proyecto —más aire ARRIBA de un título que
 * debajo— se aplica desde quien lo coloca, no desde aquí, porque este
 * componente no sabe qué tiene encima.
 */
export function TituloSeccion({
  children,
  accion,
}: {
  children: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-2xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {children}
      </h2>
      {accion}
    </div>
  )
}

/**
 * Variante de tarjeta para lo que NO es una pieza apoyada sino un hueco:
 * el estado vacío, los contenedores de segunda fila dentro de otra
 * tarjeta. Usa el pozo en vez de la arcilla.
 *
 * Existe para no caer en la tarjeta anidada, que en un sistema con
 * volumen se ve especialmente mal: dos piezas de barro una encima de
 * otra suman cuatro sombras y el resultado es papilla. Lo que va dentro
 * de una pieza se EXCAVA en ella.
 */
export function Hueco({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pozo rounded-xl p-4', className)} {...props} />
}
