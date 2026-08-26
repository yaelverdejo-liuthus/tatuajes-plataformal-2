import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { DESPLEGAR, DURACION, transicion } from '../../lib/animacion'
import { cn } from '../../lib/cn'

/*
 * ── El campo es un HUECO, no una caja ────────────────────────────────
 *
 * Este es el otro lado del material. Una tarjeta es una pieza de barro
 * POSADA sobre la mesa: tiene filo arriba y sombra proyectada debajo. Un
 * campo de formulario es lo contrario — un hueco EXCAVADO en la pieza — y
 * por eso lleva `.pozo`: sombra interior desde arriba, ningún apoyo
 * debajo. Un hoyo no proyecta sombra.
 *
 * La distinción no es un juego formal, es lo que hace que un formulario
 * se entienda sin leer nada: lo que sobresale se aprieta, lo que se hunde
 * se llena. Antes los dos eran el mismo rectángulo con borde de 1px y la
 * única diferencia era el color de fondo.
 *
 * El error no pinta un borde rojo —no hay bordes— sino que tiñe el propio
 * hueco. La `ring` de error se queda porque un hueco rojo sobre una
 * superficie oscura es un cambio sutil, y un campo rechazado tiene que
 * encontrarse de un vistazo en un formulario de doce.
 */
const BASE =
  'pozo w-full rounded-xl px-3.5 text-base text-fg ' +
  'placeholder:text-fg-subtle ' +
  '[transition-property:box-shadow,background-color] duration-150 ease-salida ' +
  'disabled:opacity-60'

/**
 * El pozo de un campo rechazado. La clase vive en index.css porque tiene
 * que SUMAR su filo rojo a la sombra del hueco, y las utilidades `ring-*`
 * de Tailwind sustituyen `box-shadow` en vez de sumarse a él.
 */
const POZO_ERROR = 'pozo-error'

/**
 * Ata el mensaje al campo para quien no lo está viendo.
 *
 * El error se pintaba en rojo debajo del input y ahí se acababa: para un
 * lector de pantalla el campo seguía siendo válido y sin descripción. Quien
 * navega a ciegas oía "Correo, cuadro de edición" y nada más — el motivo
 * del rechazo estaba en pantalla y era el único que no se enteraba.
 *
 * Devuelve el par que hay que ponerle al control. Va aquí y no en cada
 * campo porque los cuatro (input, número, select, textarea) comparten la
 * misma envoltura, y porque el id lo tiene que conocer también el <p>.
 */
export function atributosDescripcion(idFinal: string, error?: string, hint?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${idFinal}-error` : hint ? `${idFinal}-hint` : undefined,
  } as const
}

/**
 * La etiqueta, el control y su mensaje. Exportada porque los selectores de
 * fecha y hora no son `<input>` —son un botón que abre un panel— pero
 * tienen que verse y anunciarse igual que el resto de los campos.
 */
export function Envoltura({
  etiqueta,
  hint,
  error,
  htmlFor,
  children,
}: {
  etiqueta?: string
  hint?: string
  error?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      {etiqueta && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-fg-muted">
          {etiqueta}
        </label>
      )}
      {children}
      {/*
        El error se despliega en vez de aparecer de golpe: al validar un
        formulario largo salían tres o cuatro a la vez y todo lo de abajo
        pegaba un brinco, que es justo cuando se pierde de vista cuál campo
        falló. Al colapsar la altura, el empujón se vuelve legible.
      */}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${htmlFor}-error`}
            variants={DESPLEGAR}
            initial="oculto"
            animate="visible"
            exit="saliendo"
            transition={transicion(DURACION.rapida)}
            className="overflow-hidden text-sm text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={`${htmlFor}-hint`} className="text-sm text-fg-subtle">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { etiqueta, hint, error, className, id, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <input
        ref={ref}
        id={idFinal}
        {...atributosDescripcion(idFinal, error, hint)}
        className={cn(BASE, 'h-11', error && POZO_ERROR, className)}
        {...props}
      />
    </Envoltura>
  )
})

/**
 * Input de número. inputMode="numeric" para que en el celular salga el
 * teclado numérico y no el alfabético — §3.1 del brief.
 */
export const InputNumero = forwardRef<HTMLInputElement, InputProps & { prefijo?: string }>(
  function InputNumero({ etiqueta, hint, error, className, id, prefijo, ...props }, ref) {
    const auto = useId()
    const idFinal = id ?? auto
    return (
      <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
        <div className="relative">
          {prefijo && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-fg-subtle">
              {prefijo}
            </span>
          )}
          <input
            ref={ref}
            id={idFinal}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            {...atributosDescripcion(idFinal, error, hint)}
            className={cn(
              BASE,
              'tabular h-11',
              prefijo && 'pl-8',
              error && POZO_ERROR,
              className,
            )}
            {...props}
          />
        </div>
      </Envoltura>
    )
  },
)

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

/**
 * Select nativo: en móvil la rueda del sistema gana a cualquier dropdown propio.
 *
 * La flecha es un icono de la librería y no un SVG incrustado en un
 * `background-image`. Dentro de un data URI el color va escrito a mano, y el
 * que estaba —#A0A0AE— es el `--fg-muted` del tema OSCURO: en claro la
 * flecha salía lavada mientras el texto de al lado iba en un gris mucho más
 * firme. Como elemento hereda `currentColor` y los dos temas se resuelven
 * solos. De paso deja de haber un icono dibujado a mano conviviendo con la
 * familia de lucide que usa el resto de la app.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { etiqueta, hint, error, className, id, children, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <div className="relative">
        <select
          ref={ref}
          id={idFinal}
          {...atributosDescripcion(idFinal, error, hint)}
          className={cn(
            BASE,
            'h-11 appearance-none pr-10',
            error && POZO_ERROR,
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={2.5}
          className="pointer-events-none absolute right-3 top-1/2 size-[1.1rem] -translate-y-1/2 text-fg-muted"
        />
      </div>
    </Envoltura>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { etiqueta, hint, error, className, id, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <textarea
        ref={ref}
        id={idFinal}
        rows={3}
        {...atributosDescripcion(idFinal, error, hint)}
        className={cn(
          BASE,
          'resize-none py-2.5 leading-relaxed',
          error && POZO_ERROR,
          className,
        )}
        {...props}
      />
    </Envoltura>
  )
})

/**
 * Interruptor. 44px de alto de área táctil aunque el riel se vea más chico.
 *
 * En arcilla el interruptor se explica solo: el riel es un CANAL excavado
 * y la perilla es una pieza que se apoya dentro y corre por él. Es el
 * mismo par pozo/pieza que separa un campo de una tarjeta, aplicado a un
 * control, y por eso no necesita ninguna etiqueta de "on/off" para que se
 * entienda de qué lado está.
 *
 * El color del canal sigue siendo lo que dice el estado —verde violeta
 * encendido, hueco apagado— porque la posición sola no basta para quien
 * no distingue bien la izquierda de la derecha en un riel de 44px.
 */
export function Switch({
  activo,
  onCambio,
  etiqueta,
  descripcion,
  disabled,
}: {
  activo: boolean
  onCambio: (v: boolean) => void
  etiqueta: string
  descripcion?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={() => onCambio(!activo)}
      className="group flex w-full items-center justify-between gap-4 rounded-xl py-2 text-left disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-base text-fg">{etiqueta}</span>
        {descripcion && <span className="block text-sm text-fg-subtle">{descripcion}</span>}
      </span>

      {/* El canal. Encendido se llena de color, apagado queda hueco. */}
      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full',
          'transition-[background-color,box-shadow] duration-200 ease-salida',
          activo ? 'bg-primary shadow-pozo' : 'pozo',
        )}
      >
        {/*
          La perilla se pinta contra su canal, no en blanco fijo. Apagada
          el canal es el fondo hondo, que en tema claro es un lila casi
          blanco: una perilla blanca encima daba 1.1:1 y el interruptor
          parecía un riel vacío. Encendida el canal es `primary`, y ahí
          `primary-fg` es el token que ya existe para lo que va montado
          sobre el morado.

          Lleva `arcilla-sutil` para que se lea como pieza apoyada dentro
          del canal y no como un círculo pintado en él. Es la sombra la
          que la mete dentro.
        */}
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full shadow-arcilla-sutil',
            activo ? 'bg-primary-fg' : 'bg-fg-muted',
            'transition-transform duration-200 ease-salida',
            activo ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}
