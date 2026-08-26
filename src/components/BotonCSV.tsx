import { Download } from 'lucide-react'
import { descargarCSV } from '../lib/csv'
import { cn } from '../lib/cn'

/**
 * Exportar a CSV. Sirve para dos cosas concretas: comparar contra el Sheet
 * mientras corren en paralelo, y sacar los datos si algún día se quiere
 * migrar a otro lado. Los datos son suyos.
 */
export function BotonCSV({
  nombre,
  filas,
  className,
}: {
  nombre: string
  filas: Record<string, unknown>[]
  className?: string
}) {
  if (filas.length === 0) return null

  return (
    <button
      onClick={() => descargarCSV(nombre, filas)}
      title={`Exportar ${filas.length} filas a CSV`}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-xl text-fg-subtle',
        'transition-colors hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      <Download className="h-[18px] w-[18px]" />
      <span className="sr-only">Exportar CSV</span>
    </button>
  )
}
