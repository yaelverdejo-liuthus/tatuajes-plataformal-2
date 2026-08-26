import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { Button } from './ui/Button'

/**
 * Confirmación de borrado. Único lugar donde se pregunta "¿seguro?".
 *
 * No hay papelera ni deshacer en toda la plataforma: lo que se borra aquí
 * se va de la base y no vuelve. Por eso el diálogo dice qué se va a borrar
 * por su nombre, y el botón peligroso nunca es el que queda bajo el pulgar
 * por default.
 *
 * Va en z-[55]: encima de los Sheet (z-50), porque casi siempre se abre
 * desde dentro de uno, y debajo de los toasts (z-[60]), para que el aviso
 * de "no se pudo borrar" se lea aunque el diálogo siga arriba.
 */
export function ConfirmarBorrado({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  descripcion,
  etiqueta = 'Eliminar',
}: {
  abierto: boolean
  onCerrar: () => void
  /** Debe lanzar si falla: el diálogo se queda abierto para reintentar. */
  onConfirmar: () => Promise<void>
  titulo: string
  descripcion: ReactNode
  etiqueta?: string
}) {
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const alEscape = (e: KeyboardEvent) => e.key === 'Escape' && !borrando && onCerrar()
    window.addEventListener('keydown', alEscape)
    return () => window.removeEventListener('keydown', alEscape)
  }, [abierto, borrando, onCerrar])

  async function confirmar() {
    setBorrando(true)
    try {
      await onConfirmar()
    } catch {
      // El que llama ya mostró el toast con el motivo. Aquí solo se evita
      // que el rechazo escape: el diálogo se queda abierto para reintentar
      // o cancelar con el contexto todavía a la vista.
    } finally {
      setBorrando(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => !borrando && onCerrar()}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm rounded-3xl bg-surface p-5 shadow-arcilla-alta"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/12 text-danger">
              <TriangleAlert className="h-5 w-5" />
            </div>

            <h2 className="font-display mt-3.5 text-xl font-semibold tracking-tight text-fg">{titulo}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-fg-muted">{descripcion}</div>
            <p className="mt-2.5 text-sm text-fg-subtle">Esto no se puede deshacer.</p>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                bloque
                tamano="lg"
                variante="peligro"
                cargando={borrando}
                onClick={() => void confirmar()}
              >
                {etiqueta}
              </Button>
              <Button
                bloque
                tamano="lg"
                variante="secundario"
                disabled={borrando}
                onClick={onCerrar}
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
