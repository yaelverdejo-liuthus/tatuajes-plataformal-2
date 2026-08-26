import { motion } from 'framer-motion'
import { RESORTE_VIAJE } from '../../lib/animacion'
import { cn } from '../../lib/cn'

export interface Opcion<T extends string> {
  valor: T
  etiqueta: string
  conteo?: number
}

/**
 * Filtro segmentado con indicador deslizante.
 *
 * ── Qué cambió y por qué ─────────────────────────────────────────────
 *
 * El carril ahora es un POZO y la pastilla activa es una PIEZA que corre
 * dentro de él. Antes los dos eran rectángulos de distinto color: el
 * carril `surface-2`, la pastilla `primary`. Funcionaba, pero no decía
 * nada — el color solo señalaba cuál está elegido, no que hubiera una
 * cosa moviéndose por un canal.
 *
 * Con el canal excavado, el indicador deja de ser un resaltado y pasa a
 * ser un objeto con posición. Eso es lo que hace que el resorte se
 * entienda: no es una animación puesta encima, es la pieza llegando.
 *
 * Scrollea horizontal en móvil en vez de apretujar las opciones.
 */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
  idGrupo,
}: {
  opciones: Opcion<T>[]
  valor: T
  onCambio: (v: T) => void
  idGrupo: string
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="pozo inline-flex gap-1 rounded-2xl p-1.5">
        {opciones.map((o) => {
          const activo = o.valor === valor
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => onCambio(o.valor)}
              aria-pressed={activo}
              className={cn(
                'relative whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium',
                /*
                 * Se hunde al presionar. Es el control más tocado de la
                 * app —cada cambio de filtro pasa por aquí— y era el
                 * único sin acuse de recibo: el indicador viaja con su
                 * resorte, pero eso empieza DESPUÉS de que el dedo ya se
                 * fue. El hundido confirma en el momento del toque.
                 *
                 * Aquí NO se usa `.pulsable`: esa clase cambia la sombra
                 * a `arcilla-hundida`, y estos botones no tienen sombra
                 * propia — la lleva la pastilla que viaja detrás. Solo
                 * el encogido.
                 */
                'transition-[color,transform] duration-toque ease-salida active:scale-[0.96]',
                activo ? 'text-primary-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {activo && (
                <motion.span
                  layoutId={`segmentado-${idGrupo}`}
                  transition={RESORTE_VIAJE}
                  className="absolute inset-0 rounded-xl bg-primary shadow-arcilla-sutil"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {o.etiqueta}
                {o.conteo != null && (
                  <span
                    className={cn(
                      'tabular text-2xs',
                      activo ? 'text-primary-fg/70' : 'text-fg-subtle',
                    )}
                  >
                    {o.conteo}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
