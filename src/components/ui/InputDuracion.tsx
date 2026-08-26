import { useEffect, useId, useState } from 'react'
import { cn } from '../../lib/cn'

/**
 * Duración en horas y minutos, guardada en minutos.
 *
 * El campo era un solo input "minutos": para registrar una sesión de dos
 * horas y media había que teclear 150, o sea hacer la cuenta mentalmente
 * al final del día, que es cuando peor se hacen las cuentas. La base sigue
 * guardando minutos — eso no cambia, porque de ahí sale la tarifa real por
 * hora — pero quien captura ya no tiene que traducir nada.
 */
export function InputDuracion({
  valor,
  onCambio,
  etiqueta,
  hint,
  error,
  disabled,
}: {
  /** Minutos totales, o null si está vacío. */
  valor: number | null
  onCambio: (minutos: number | null) => void
  etiqueta?: string
  hint?: string
  error?: string
  disabled?: boolean
}) {
  const id = useId()

  // Texto propio para no pelear con el usuario mientras escribe: si se
  // derivara de `valor` en cada tecla, borrar el "0" de "30" lo reescribiría.
  const [horas, setHoras] = useState('')
  const [minutos, setMinutos] = useState('')
  const [enfocado, setEnfocado] = useState(false)

  useEffect(() => {
    if (enfocado) return
    if (valor == null) {
      setHoras('')
      setMinutos('')
      return
    }
    setHoras(valor >= 60 ? String(Math.floor(valor / 60)) : '')
    setMinutos(String(valor % 60))
  }, [valor, enfocado])

  function emitir(h: string, m: string) {
    if (h === '' && m === '') {
      onCambio(null)
      return
    }
    onCambio((Number(h) || 0) * 60 + (Number(m) || 0))
  }

  const clase = cn(
    'w-full rounded-xl pozo px-3.5 h-11 text-base text-fg tabular',
    'placeholder:text-fg-subtle transition-colors duration-150',
    'focus:border-primary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25',
    'disabled:opacity-60',
    error && 'border-danger/60 focus:ring-danger/25',
  )

  return (
    <div className="space-y-1.5">
      {etiqueta && (
        <label htmlFor={`${id}-h`} className="block text-sm font-medium text-fg-muted">
          {etiqueta}
        </label>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={`${id}-h`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            disabled={disabled}
            value={horas}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2)
              setHoras(v)
              emitir(v, minutos)
            }}
            className={cn(clase, 'pr-7')}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
            h
          </span>
        </div>

        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            disabled={disabled}
            value={minutos}
            onFocus={() => setEnfocado(true)}
            onBlur={() => {
              setEnfocado(false)
              // 90 min escritos en el campo de minutos se acomodan solos
              // a 1 h 30 en vez de rechazarse.
              const m = Number(minutos) || 0
              if (m >= 60) {
                const totalH = (Number(horas) || 0) + Math.floor(m / 60)
                setHoras(String(totalH))
                setMinutos(String(m % 60))
              }
            }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 3)
              setMinutos(v)
              emitir(horas, v)
            }}
            className={cn(clase, 'pr-12')}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
            min
          </span>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
