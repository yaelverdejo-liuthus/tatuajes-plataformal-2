import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Skeleton animado. Nunca spinner de página completa (§7 de la spec). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

/**
 * El esqueleto de una lista.
 *
 * Ahora las piezas del esqueleto son de arcilla, igual que las tarjetas
 * que van a sustituirlas. Suena a detalle y no lo es: si el esqueleto es
 * plano y lo que llega tiene volumen, cada carga termina con un salto de
 * material — la pantalla entera cambia de textura al mismo tiempo. Con el
 * mismo relieve, lo único que cambia al llegar los datos es el contenido,
 * que es lo que uno estaba esperando.
 */
export function SkeletonLista({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="arcilla rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonKPIs({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="arcilla rounded-2xl p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Estado vacío con acción. Nunca una pantalla en blanco:
 * "Sin leads hoy — Registrar el primero" (§7 de la spec).
 *
 * ── Por qué es un hueco y no una tarjeta ─────────────────────────────
 *
 * Antes era un rectángulo con borde punteado, que es la convención de
 * "aquí no hay nada" heredada de los sitios donde se arrastran archivos.
 * En un mundo con volumen no funciona: el punteado es dibujo, y todo lo
 * demás es material.
 *
 * Ahora es un POZO — un hueco excavado en la mesa. Dice literalmente lo
 * mismo, "este espacio está vacío y hay que llenarlo", pero lo dice con
 * el mismo material que el resto y sin una sola línea punteada. Y el
 * botón que lo llena queda dentro del hueco, que es donde va.
 */
export function Vacio({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  icono: ReactNode
  titulo: string
  descripcion?: string
  accion?: ReactNode
}) {
  return (
    // Sin animación de entrada, a propósito. Este componente existe para
    // que nunca haya una pantalla vacía; si para verse dependiera de que
    // arranque una animación, sería justo lo que vino a evitar.
    <div className="pozo flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      {/* El icono va sobre una pastilla de barro: es la única pieza que
          sobresale del hueco, y por eso es lo primero que se mira. */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-arcilla-sutil">
        {icono}
      </div>
      <p className="font-display text-lg font-semibold text-fg">{titulo}</p>
      {descripcion && (
        <p className="mt-1.5 max-w-[36ch] text-sm leading-relaxed text-fg-muted">{descripcion}</p>
      )}
      {accion && <div className="mt-6">{accion}</div>}
    </div>
  )
}

/**
 * Error de carga, con reintento. Tampoco se deja en blanco.
 *
 * Va en arcilla teñida de rojo, no en un recuadro con borde: es una pieza
 * que llegó mal, no un aviso pegado encima. El `ring` interior sustituye
 * al borde y se suma a la sombra en vez de pisarla, porque las dos van
 * por utilidades de Tailwind y ahí sí componen.
 */
export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    // Tampoco se anima, por lo mismo: si un mensaje de error dependiera de
    // una animación para verse, el peor caso sería una pantalla vacía justo
    // cuando algo ya salió mal.
    <div className="rounded-2xl bg-danger/10 p-4 shadow-arcilla ring-1 ring-inset ring-danger/25">
      <p className="font-display text-base font-semibold text-danger">No se pudo cargar</p>
      <p className="mt-1 text-sm text-fg-muted">{mensaje}</p>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="pulsable mt-3.5 rounded-lg bg-danger/15 px-3 py-1.5 text-sm font-medium text-danger"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
