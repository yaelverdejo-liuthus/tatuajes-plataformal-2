import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover } from './Popover'
import { Envoltura } from './Campo'
import { aFechaLocal, hoyISO } from '../../lib/formato'
import { cn } from '../../lib/cn'

/**
 * Selector de fecha propio, en lugar del `<input type="date">` del navegador.
 *
 * El nativo se veía distinto en cada navegador y en ninguno se parecía al
 * resto de la app: tipografía del sistema, colores del sistema, y en
 * Chrome de escritorio un calendario gris que ignora el tema oscuro. El
 * cliente lo dijo con todas sus letras — "está medio feo el calendario
 * para escoger".
 *
 * Decisiones que valen la pena explicar:
 *
 * · SEMANA EN LUNES. `getDay()` cuenta desde el domingo, que es la
 *   convención de Estados Unidos. Aquí la semana empieza en lunes, así que
 *   el índice se corre. Un calendario con el sábado a media fila es el
 *   detalle que hace que se sienta ajeno.
 *
 * · SIEMPRE SEIS FILAS. Un mes cabe en cinco o seis según en qué día caiga
 *   el primero. Dibujando solo las que hacen falta, el panel cambia de
 *   alto al navegar entre meses y los botones de abajo saltan bajo el
 *   dedo. Se rellena con los días vecinos, atenuados.
 *
 * · ATAJOS DE HOY Y MAÑANA. En un estudio, la enorme mayoría de lo que se
 *   captura es hoy o mañana. Que eso cueste un toque en vez de buscar el
 *   número en la rejilla es la diferencia real de velocidad.
 *
 * · TECLADO COMPLETO. Flechas para moverse por día, Re/Av Pág por mes,
 *   Inicio y Fin para los extremos de la semana, Enter para elegir. Quien
 *   captura muchas citas seguidas no suelta el teclado.
 */

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Date → 'YYYY-MM-DD' en local, sin pasar por UTC ni perder un día. */
function aISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Lunes = 0 … domingo = 6. */
const indiceLunes = (d: Date) => (d.getDay() + 6) % 7

function sumarDias(iso: string, n: number) {
  const d = aFechaLocal(iso)
  d.setDate(d.getDate() + n)
  return aISO(d)
}

/** Las 42 casillas del mes que contiene `ancla`, empezando en lunes. */
function rejilla(ancla: string) {
  const base = aFechaLocal(ancla)
  const primero = new Date(base.getFullYear(), base.getMonth(), 1)
  const inicio = new Date(primero)
  inicio.setDate(1 - indiceLunes(primero))

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return { iso: aISO(d), dia: d.getDate(), delMes: d.getMonth() === base.getMonth() }
  })
}

/** '2026-08-22' → 'sáb 22 de agosto' — lo que se lee en el campo cerrado. */
function textoCampo(iso: string) {
  const d = aFechaLocal(iso)
  const dia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]
  return `${dia.slice(0, 3)} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function etiquetaLarga(iso: string) {
  const d = aFechaLocal(iso)
  const dia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]
  return `${dia} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

interface Props {
  valor: string
  onCambio: (iso: string) => void
  etiqueta?: string
  hint?: string
  error?: string
  disabled?: boolean
  /** Deja poner el campo en blanco. Para las fechas que no son obligatorias. */
  opcional?: boolean
  className?: string
}

export const SelectorFecha = forwardRef<HTMLButtonElement, Props>(function SelectorFecha(
  { valor, onCambio, etiqueta, hint, error, disabled, opcional, className },
  ref,
) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [disparador, setDisparador] = useState<HTMLButtonElement | null>(null)
  const hoy = useMemo(() => hoyISO(), [])

  // El día que tiene el foco del teclado. Arranca en el elegido, o en hoy.
  const [foco, setFoco] = useState(() => valor || hoy)
  const celdas = useMemo(() => rejilla(foco), [foco])
  const anclaMes = aFechaLocal(foco)

  const rejillaRef = useRef<HTMLDivElement>(null)

  // Al abrir se vuelve al día elegido: si alguien navegó tres meses y
  // cerró sin elegir, reabrir en noviembre no tendría ninguna lógica.
  useEffect(() => {
    if (abierto) setFoco(valor || hoy)
  }, [abierto, valor, hoy])

  // El foco real del navegador sigue al día enfocado, para que el lector
  // de pantalla anuncie sobre qué fecha está parado.
  useEffect(() => {
    if (!abierto) return
    const t = window.setTimeout(() => {
      rejillaRef.current?.querySelector<HTMLElement>('[data-foco="true"]')?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [abierto, foco])

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

  function elegir(iso: string) {
    onCambio(iso)
    setAbierto(false)
    disparador?.focus()
  }

  function alTeclado(e: React.KeyboardEvent) {
    const saltos: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    if (e.key in saltos) {
      e.preventDefault()
      setFoco((f) => sumarDias(f, saltos[e.key]))
      return
    }
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      const d = aFechaLocal(foco)
      d.setMonth(d.getMonth() + (e.key === 'PageUp' ? -1 : 1))
      setFoco(aISO(d))
      return
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const i = indiceLunes(aFechaLocal(foco))
      setFoco((f) => sumarDias(f, e.key === 'Home' ? -i : 6 - i))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      elegir(foco)
    }
  }

  function moverMes(n: number) {
    const d = aFechaLocal(foco)
    d.setMonth(d.getMonth() + n)
    setFoco(aISO(d))
  }

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
          valor ? 'text-fg' : 'text-fg-subtle',
          className,
        )}
      >
        <span className="truncate">{valor ? textoCampo(valor) : 'Elegir fecha'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </button>

      <Popover
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        disparador={disparador}
        ancho={312}
        etiqueta={etiqueta ? `Calendario: ${etiqueta}` : 'Calendario'}
      >
        <div className="p-3">
          {/* ── Mes y navegación ── */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <FlechaMes hacia={-1} onClick={() => moverMes(-1)} />
            <p aria-live="polite" className="font-display text-base font-semibold text-fg">
              {MESES[anclaMes.getMonth()]}{' '}
              <span className="text-fg-subtle">{anclaMes.getFullYear()}</span>
            </p>
            <FlechaMes hacia={1} onClick={() => moverMes(1)} />
          </div>

          {/* ── Iniciales de los días ── */}
          <div className="grid grid-cols-7 gap-0.5">
            {DIAS.map((d, i) => (
              <div
                key={i}
                aria-hidden
                className="pb-1 text-center text-2xs font-semibold uppercase text-fg-subtle"
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Los días ── */}
          <div
            ref={rejillaRef}
            role="grid"
            aria-label="Días del mes"
            onKeyDown={alTeclado}
            className="grid grid-cols-7 gap-0.5"
          >
            {celdas.map((c) => {
              const elegido = c.iso === valor
              const esHoy = c.iso === hoy
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="gridcell"
                  aria-selected={elegido}
                  aria-current={esHoy ? 'date' : undefined}
                  aria-label={etiquetaLarga(c.iso)}
                  data-foco={c.iso === foco}
                  tabIndex={c.iso === foco ? 0 : -1}
                  onClick={() => elegir(c.iso)}
                  className={cn(
                    /* 44 px en táctil, que es el mínimo de área para un
                       dedo, y 40 en escritorio donde apunta un cursor y
                       la altura solo cuesta espacio. */
                    'relative flex h-11 items-center justify-center rounded-lg text-sm tabular sm:h-10',
                    'transition-colors duration-150 ease-out',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                    elegido
                      ? 'bg-primary font-semibold text-primary-fg'
                      : c.delMes
                        ? 'text-fg hover:bg-surface-2'
                        : // Los días vecinos se quedan: son los que mantienen
                          // las seis filas y evitan que el panel cambie de
                          // alto. Atenuados para que no compitan.
                          'text-fg-subtle/60 hover:bg-surface-2',
                    esHoy && !elegido && 'font-semibold text-primary',
                  )}
                >
                  {c.dia}
                  {esHoy && (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute bottom-1 h-1 w-1 rounded-full',
                        elegido ? 'bg-primary-fg' : 'bg-primary',
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Atajos ── */}
          <div className="mt-2.5 flex items-center gap-1.5 pt-2.5">
            <Atajo onClick={() => elegir(hoy)}>Hoy</Atajo>
            <Atajo onClick={() => elegir(sumarDias(hoy, 1))}>Mañana</Atajo>
            {opcional && valor && (
              <Atajo
                onClick={() => {
                  onCambio('')
                  setAbierto(false)
                  disparador?.focus()
                }}
                className="ml-auto text-danger"
              >
                Quitar
              </Atajo>
            )}
          </div>
        </div>
      </Popover>
    </Envoltura>
  )
})

function FlechaMes({ hacia, onClick }: { hacia: -1 | 1; onClick: () => void }) {
  const Icono = hacia === -1 ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hacia === -1 ? 'Mes anterior' : 'Mes siguiente'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-fg active:scale-[0.94]"
    >
      <Icono className="h-4 w-4" aria-hidden />
    </button>
  )
}

function Atajo({
  onClick,
  className,
  children,
}: {
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary',
        'transition-[color,transform] duration-150 ease-out hover:bg-surface-2 active:scale-[0.97]',
        className,
      )}
    >
      {children}
    </button>
  )
}
