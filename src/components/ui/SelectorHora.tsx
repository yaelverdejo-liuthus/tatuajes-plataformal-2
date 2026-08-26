import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { Popover } from './Popover'
import { Envoltura } from './Campo'
import { hora12 } from '../../lib/formato'
import { cn } from '../../lib/cn'

/**
 * Selector de hora propio, en lugar del `<input type="time">` del navegador.
 *
 * La queja del cliente fue "tienes que escribir todo a mano", y era
 * literal: el input nativo obliga a teclear hora, minutos y a.m./p.m. por
 * segmentos, con el teclado, cada vez. Para agendar una cita a las cuatro
 * de la tarde eran cinco pulsaciones y un tabulador.
 *
 * Aquí son un toque. Un estudio no agenda a las 14:07: agenda en punto y
 * media, así que la lista de horas cada media hora cubre prácticamente
 * todo lo que se captura en un día.
 *
 * Y no quita capacidad: abajo queda "Otra hora", que acepta lo que uno
 * escriba de verdad —"2:30 pm", "14:30", "230pm", "9 am"— en vez de exigir
 * un formato. Quien necesita las 14:15 lo puede poner; solo que ya no es
 * el camino obligatorio para todos los demás.
 */

/* De 8:00 a 21:30. Antes de las ocho no abre el estudio y después de las
   nueve y media ya no se empieza una sesión; lo de fuera de ese rango
   entra por "Otra hora". */
const DESDE = 8 * 60
const HASTA = 21 * 60 + 30
const PASO = 30

const aHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const RANURAS = Array.from({ length: (HASTA - DESDE) / PASO + 1 }, (_, i) => aHHMM(DESDE + i * PASO))

/** Normaliza lo que venga de la base: '16:00:00' y '16:00' son la misma hora. */
const normalizar = (v: string) => (v ? v.slice(0, 5) : '')

/**
 * Entiende una hora escrita como la escribe una persona.
 *
 * Acepta "14:30", "2:30 pm", "230 pm", "2pm" y "9" a secas. Devuelve
 * 'HH:MM', o null si no hay forma de leerlo.
 *
 * Los minutos van de dos dígitos o no van: "7:5" se rechaza en vez de
 * adivinar entre las 7:05 y las 7:50. Ante la duda no se inventa una hora
 * para una cita.
 *
 * La regla del mediodía es la que más se equivoca en estos parsers: las
 * 12 a.m. son las 00:00 y las 12 p.m. son las 12:00, no al revés.
 */
export function leerHora(texto: string): string | null {
  const t = texto.trim().toLowerCase().replace(/\s+/g, '')
  if (!t) return null

  const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(a\.?m\.?|p\.?m\.?)?$/)
  if (!m) return null

  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const suf = m[3]?.replace(/\./g, '')

  if (min > 59) return null

  if (suf === 'pm' && h < 12) h += 12
  else if (suf === 'am' && h === 12) h = 0

  if (h > 23) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

interface Props {
  valor: string
  onCambio: (hhmm: string) => void
  etiqueta?: string
  hint?: string
  error?: string
  disabled?: boolean
  opcional?: boolean
  className?: string
}

export const SelectorHora = forwardRef<HTMLButtonElement, Props>(function SelectorHora(
  { valor, onCambio, etiqueta, hint, error, disabled, opcional, className },
  ref,
) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [disparador, setDisparador] = useState<HTMLButtonElement | null>(null)
  const [libre, setLibre] = useState('')
  const lista = useRef<HTMLDivElement>(null)
  const actual = normalizar(valor)

  // Fuera de la lista significa que se escribió a mano: entonces el campo
  // libre arranca con ese valor y no vacío, para poder corregirlo.
  const esRanura = useMemo(() => RANURAS.includes(actual), [actual])

  useEffect(() => {
    if (abierto) setLibre(actual && !esRanura ? hora12(actual) : '')
  }, [abierto, actual, esRanura])

  // Al abrir, la hora elegida queda a la vista sin tener que buscarla.
  useEffect(() => {
    if (!abierto) return
    const t = window.setTimeout(() => {
      lista.current
        ?.querySelector<HTMLElement>('[data-elegida="true"]')
        ?.scrollIntoView({ block: 'center' })
    }, 0)
    return () => window.clearTimeout(t)
  }, [abierto])

  /*
   * Estable con useCallback y no una flecha en línea. Un ref en línea cambia
   * de identidad en cada render, y React responde llamándolo con null y
   * luego con el elemento: dos `setState` por render, con un instante en
   * que el disparador es null y el panel no tiene a qué anclarse.
   */
  const guardarDisparador = useCallback(
    (el: HTMLButtonElement | null) => {
      setDisparador(el)
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )

  function elegir(hhmm: string) {
    onCambio(hhmm)
    setAbierto(false)
    disparador?.focus()
  }

  function confirmarLibre() {
    const leida = leerHora(libre)
    if (leida) elegir(leida)
  }

  const libreValida = libre.trim() === '' || leerHora(libre) !== null

  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={id}>
      <button
        ref={guardarDisparador}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-xl pozo px-3.5 text-left text-base',
          'transition-colors duration-150 ease-out',
          'focus:border-primary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25',
          'disabled:opacity-60',
          error && 'border-danger/60 focus:ring-danger/25',
          actual ? 'text-fg' : 'text-fg-subtle',
          className,
        )}
      >
        <span className="truncate tabular">{actual ? hora12(actual) : 'Elegir hora'}</span>
        <Clock className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </button>

      <Popover
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        disparador={disparador}
        ancho={264}
        etiqueta={etiqueta ? `Horas: ${etiqueta}` : 'Elegir hora'}
      >
        <div
          ref={lista}
          role="listbox"
          aria-label="Horas disponibles"
          className="grid max-h-60 grid-cols-2 gap-1 overflow-y-auto p-2"
        >
          {RANURAS.map((h) => {
            const elegida = h === actual
            return (
              <button
                key={h}
                type="button"
                role="option"
                aria-selected={elegida}
                data-elegida={elegida}
                onClick={() => elegir(h)}
                className={cn(
                  'tabular rounded-lg px-2 py-2.5 text-sm',
                  'transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  elegida
                    ? 'bg-primary font-semibold text-primary-fg'
                    : 'text-fg hover:bg-surface-2',
                )}
              >
                {hora12(h)}
              </button>
            )
          })}
        </div>

        {/* ── La salida para lo que no está en la lista ── */}
        <div className="p-2">
          <label htmlFor={`${id}-libre`} className="sr-only">
            Otra hora
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id={`${id}-libre`}
              value={libre}
              onChange={(e) => setLibre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirmarLibre()
                }
              }}
              placeholder="Otra hora: 2:30 pm"
              aria-invalid={!libreValida}
              className={cn(
                'h-9 min-w-0 flex-1 rounded-lg border bg-surface-2 px-2.5 text-sm text-fg',
                'placeholder:text-fg-subtle focus:outline-none focus:ring-2',
                libreValida
                  ? 'border-line focus:border-primary/60 focus:ring-primary/25'
                  : 'border-danger/60 focus:ring-danger/25',
              )}
            />
            <button
              type="button"
              onClick={confirmarLibre}
              disabled={!libre.trim() || !libreValida}
              className={cn(
                'h-9 shrink-0 rounded-lg px-3 text-sm font-medium',
                'transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97]',
                'bg-surface-2 text-fg hover:bg-surface-3 disabled:opacity-40',
              )}
            >
              Usar
            </button>
            {opcional && actual && (
              <button
                type="button"
                onClick={() => {
                  onCambio('')
                  setAbierto(false)
                  disparador?.focus()
                }}
                className="h-9 shrink-0 rounded-lg px-2.5 text-sm font-medium text-danger transition-colors duration-150 ease-out hover:bg-surface-2"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      </Popover>
    </Envoltura>
  )
})
