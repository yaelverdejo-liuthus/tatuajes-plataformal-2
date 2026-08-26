import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

const limpiar = (s: string) => s.trim().replace(/\s+/g, ' ')

/**
 * Chips de tags: agregar con Enter o coma, quitar con la × o Backspace
 * sobre el campo vacío. Sin tabla aparte — el tag vive como texto libre
 * dentro de `contenido.tags`, así que "crear" un tag es solo escribirlo.
 */
export function EditorTags({
  valor,
  onCambio,
  sugerencias = [],
  etiqueta,
  hint,
  placeholder = 'Escribe y presiona Enter',
  deshabilitado,
}: {
  valor: string[]
  onCambio: (tags: string[]) => void
  /** Tags ya usados en otros videos, para agregarlos con un tap. */
  sugerencias?: string[]
  etiqueta?: string
  hint?: string
  placeholder?: string
  deshabilitado?: boolean
}) {
  const [texto, setTexto] = useState('')

  function agregar(bruto: string) {
    const t = limpiar(bruto)
    if (!t) return
    const yaExiste = valor.some((v) => v.toLowerCase() === t.toLowerCase())
    if (!yaExiste) onCambio([...valor, t])
    setTexto('')
  }

  function quitar(t: string) {
    onCambio(valor.filter((v) => v !== t))
  }

  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      agregar(texto)
    } else if (e.key === 'Backspace' && texto === '' && valor.length > 0) {
      quitar(valor[valor.length - 1])
    }
  }

  const disponibles = sugerencias.filter(
    (s) => !valor.some((v) => v.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className="space-y-1.5">
      {etiqueta && <span className="block text-sm font-medium text-fg-muted">{etiqueta}</span>}

      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-xl pozo px-2.5 py-2',
          'transition-colors duration-150',
          !deshabilitado &&
            'focus-within:border-primary/60 focus-within:bg-surface focus-within:ring-2 focus-within:ring-primary/25',
          deshabilitado && 'opacity-60',
        )}
      >
        {valor.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 py-1 pl-2.5 pr-1.5 text-sm text-primary"
          >
            {t}
            {!deshabilitado && (
              <button
                type="button"
                onClick={() => quitar(t)}
                aria-label={`Quitar tag ${t}`}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/25"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}

        {!deshabilitado && (
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alTeclear}
            onBlur={() => agregar(texto)}
            placeholder={valor.length === 0 ? placeholder : ''}
            className="min-w-[6rem] flex-1 bg-transparent py-1 text-base text-fg outline-none placeholder:text-fg-subtle"
          />
        )}
      </div>

      {!deshabilitado && disponibles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {disponibles.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => agregar(s)}
              className="rounded-full pozo px-2.5 py-1 text-xs text-fg-subtle transition-colors hover:border-primary/40 hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {hint && <p className="text-sm text-fg-subtle">{hint}</p>}
    </div>
  )
}
