import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { RESORTE } from '../../lib/animacion'
import { cn } from '../../lib/cn'

/**
 * Bottom sheet. Los formularios van aquí, nunca en un modal centrado de
 * escritorio metido a fuerza en una pantalla chica (§3.1 del brief).
 *
 * En desktop se convierte en un panel lateral derecho, que aprovecha mejor
 * el espacio que un sheet abajo.
 */
export function Sheet({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  pie,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  pie?: ReactNode
}) {
  useEffect(() => {
    if (!abierto) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alEscape = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alEscape)
    return () => {
      document.body.style.overflow = previo
      window.removeEventListener('keydown', alEscape)
    }
  }, [abierto, onCerrar])

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCerrar}
            /*
              El velo va teñido del fondo de la app, no negro puro, y con
              un desenfoque corto. Sobre un mundo con volumen un negro
              plano al 55% aplana todo lo que hay debajo de golpe: la
              hoja queda flotando sobre una silueta, no sobre la app.
            */
            className="absolute inset-0 bg-bg/70 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={RESORTE}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onCerrar()
            }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col',
              // La hoja es la pieza más grande de la app, así que es la que
              // más radio pide: una pared gruesa en una superficie de este
              // tamaño remata muy redondeada o parece cartón doblado.
              'rounded-t-4xl bg-surface shadow-hoja',
              'md:max-h-none md:w-[27rem] md:rounded-none md:rounded-l-4xl',
            )}
          >
            {/* agarradera: señal de que se puede arrastrar para cerrar */}
            <div className="flex justify-center pt-2.5 md:hidden">
              {/* Un canal excavado, no una barra pintada encima: es el mismo
                  pozo del resto del sistema, en miniatura, y dice "de aquí
                  se jala" mucho mejor que un rectángulo gris. */}
              <div className="pozo h-1.5 w-10 rounded-full" />
            </div>

            <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 md:pt-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-fg">{titulo}</h2>
                {descripcion && (
                  <p className="mt-0.5 text-sm text-fg-muted">{descripcion}</p>
                )}
              </div>
              <button
                onClick={onCerrar}
                aria-label="Cerrar"
                className="pulsable -mr-1.5 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-subtle hover:bg-surface-2 hover:text-fg hover:shadow-arcilla-sutil"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

            {pie && (
              <footer /*
                El pie se separa con una sombra hacia arriba, no con un
                borde. Es la misma decisión que en las tarjetas: en un
                sistema con volumen, una línea de 1px es lo único que se
                lee como dibujo en vez de como material.
              */
              className="safe-bottom bg-surface px-5 py-3.5 shadow-[0_-8px_16px_-12px_rgb(0_0_0/0.5)]">
                {pie}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
