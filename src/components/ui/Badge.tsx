import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tono = 'neutro' | 'primario' | 'exito' | 'aviso' | 'peligro' | 'info' | 'acento'

/*
 * ── La insignia es una pastilla de barro, no una etiqueta pintada ─────
 *
 * Antes era un fondo al 15% del color y ya. El problema no era el color:
 * era que sobre una tarjeta que ahora tiene volumen, una mancha plana se
 * lee como un hueco en la pieza, no como algo puesto encima.
 *
 * Lleva `arcilla-1`, el peldaño más chico de la escalera. Es la única
 * sombra de la app que puede apoyarse SOBRE otra pieza sin ensuciar,
 * porque su proyección mide 5px: apenas la despega.
 *
 * El fondo sube de 15% a 18% y el texto queda en el color pleno. Sobre la
 * superficie oscura del tema oscuro, 15% no daba cuerpo suficiente para
 * que la sombra tuviera de dónde salir.
 */
const TONOS: Record<Tono, string> = {
  neutro: 'bg-surface-3 text-fg-muted',
  primario: 'bg-primary/18 text-primary',
  exito: 'bg-success/18 text-success',
  aviso: 'bg-warn/18 text-warn',
  peligro: 'bg-danger/18 text-danger',
  info: 'bg-info/18 text-info',
  acento: 'bg-accent/18 text-accent',
}

export function Badge({
  tono = 'neutro',
  children,
  className,
  punto,
}: {
  tono?: Tono
  children: ReactNode
  className?: string
  punto?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1',
        'text-2xs font-semibold uppercase tracking-[0.06em]',
        'shadow-arcilla-sutil',
        TONOS[tono],
        className,
      )}
    >
      {punto && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/**
 * Punto de color a secas, para densidad alta en tablas.
 *
 * Este NO lleva sombra. Mide 8px: cualquier sombra a ese tamaño es una
 * mancha sucia, no un volumen. La regla del material tiene un suelo, y
 * está justo aquí.
 */
export function Punto({ tono = 'neutro' }: { tono?: Tono }) {
  const color: Record<Tono, string> = {
    neutro: 'bg-fg-subtle',
    primario: 'bg-primary',
    exito: 'bg-success',
    aviso: 'bg-warn',
    peligro: 'bg-danger',
    info: 'bg-info',
    acento: 'bg-accent',
  }
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', color[tono])} />
}
