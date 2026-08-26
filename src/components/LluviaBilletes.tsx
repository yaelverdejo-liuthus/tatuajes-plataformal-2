import { useMemo } from 'react'
import { useQuieto } from '../hooks/useQuieto'

/**
 * Lluvia de billetes de fondo para los KPI con semáforo.
 *
 * El color lo manda el estado del cuadro: verde si va bien, ámbar si hay
 * que mirarlo, rojo si va mal, y gris cuando todavía no hay con qué juzgar.
 * Así el estado se percibe antes de leer el número — el punto de la esquina
 * y el color de la cifra ya lo decían, esto lo dice con el rabillo del ojo.
 *
 * Va en CSS y no en framer, igual que la lluvia del login: son animaciones
 * infinitas y largas, y framer las recalcularía en JS en cada frame para
 * siempre. En CSS las mueve el compositor.
 *
 * Es DECORACIÓN y se comporta como tal: detrás del contenido, sin robar
 * taps, y bajo "reducir movimiento" desaparece por completo (index.css).
 * Ningún dato del tablero depende de que esto se vea. La máscara de
 * `.lluvia-billetes` la mantiene fuera de la etiqueta, la cifra y el punto.
 *
 * ── Le bajaron el volumen, y por qué ─────────────────────────────────
 *
 * Esta lluvia se ve cada vez que alguien abre el Tablero, o sea decenas
 * de veces al día, y ocupa el fondo de las siete tarjetas que son el
 * motivo de la pantalla. A esa frecuencia, la pregunta del marco de
 * Emil Kowalski no es "¿cómo la animo?" sino "¿debería animarse?", y la
 * respuesta honesta para un tablero es: mucho menos de lo que estaba.
 *
 * Así que se conserva —es de lo poco que hace que esta app tenga voz—
 * pero con tres frenos: cuatro billetes en vez de seis, más lentos, y
 * más pálidos. La regla es que la decoración nunca le compita al dato.
 * Cuando compite, pierde.
 *
 * Y se apaga sola: `data-quieto` para la tarjeta que sale de pantalla o
 * la pestaña que se va al fondo. Un bucle corriendo donde nadie lo mira
 * es batería quemada a cambio de nada.
 */

type Luz = 'verde' | 'ambar' | 'rojo' | 'sin_datos'

/** El tono de cada estado. Gris cuando no hay color que tomar. */
const COLOR: Record<Luz, string> = {
  verde: 'var(--success)',
  ambar: 'var(--warn)',
  rojo: 'var(--danger)',
  sin_datos: 'var(--fg-subtle)',
}

/* Cuatro. Con seis se leía como lluvia y también como ruido detrás de una
   cifra; con cuatro sigue leyéndose el gesto y deja de haber siempre algo
   moviéndose en el rabillo del ojo. Y son siete tarjetas con semáforo en
   el tablero, así que cada billete de más se paga siete veces en un
   teléfono de gama baja. */
const CANTIDAD = 4

/** Debajo de este ancho en px, la orla se dibuja gruesa y se van las
    cifras de las esquinas: a medio píxel, el detalle fino es lodo. */
const UMBRAL_DETALLE = 30

const entre = (min: number, max: number) => min + Math.random() * (max - min)

function sembrar() {
  return Array.from({ length: CANTIDAD }, (_, id) => {
    // La profundidad manda sobre todo lo demás, como en las calaveras: los
    // de atrás chicos, pálidos y lentos; los de adelante grandes y nítidos.
    // Sin esa correlación se ven como calcomanías en un solo plano.
    const profundidad = Math.random()
    const ancho = 20 + profundidad * 18

    return {
      id,
      izquierda: entre(-6, 92),
      ancho,
      // Lento a propósito: es fondo de una tarjeta que se lee, no un
      // protector de pantalla. Se alargó de 15-24s a 22-34s en el pase de
      // animación: a la velocidad anterior el ojo todavía seguía a los
      // billetes; a ésta ya solo los registra.
      caida: entre(22, 34) - profundidad * 5,
      // Retraso NEGATIVO: la animación arranca a media caída y la tarjeta
      // ya aparece poblada. Con retrasos positivos el tablero se ve vacío
      // los primeros veinte segundos, justo cuando lo están mirando.
      retraso: -entre(0, 32),
      vaiven: entre(3, 6),
      deriva: 4 + profundidad * 9,
      giro: entre(-70, 70),
      // El volteo va desacoplado del vaivén: si compartieran duración, el
      // billete llegaría al extremo de su deriva exactamente cuando se pone
      // de canto, y las seis harían lo mismo a la vez. Desfasados se ve
      // aire; sincronizados se ve un carrusel.
      volteo: entre(2.4, 4.8),
      // Más pálidos que antes (iba de 0.10 a 0.22).
      brillo: 0.07 + profundidad * 0.08,
      detalle: ancho < UMBRAL_DETALLE ? 'chico' : 'grande',
    }
  })
}

export function LluviaBilletes({ luz }: { luz: Luz }) {
  // Se siembran una sola vez. Si se regeneraran en cada render, cualquier
  // refresco de datos reiniciaría la lluvia desde arriba de golpe.
  const billetes = useMemo(() => sembrar(), [])

  // Se para sola cuando la tarjeta sale de pantalla o la pestaña se va al
  // fondo. En el Tablero hay siete de estas y en el teléfono solo se ven
  // dos o tres a la vez.
  const { ref, quieto } = useQuieto<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-quieto={quieto}
      className="lluvia-billetes"
      style={{ color: `rgb(${COLOR[luz]})` }}
      aria-hidden
    >
      {billetes.map((b) => (
        <div
          key={b.id}
          className="carril-caida"
          style={{
            left: `${b.izquierda}%`,
            animationDuration: `${b.caida}s`,
            animationDelay: `${b.retraso}s`,
            ['--giro' as string]: `${b.giro}deg`,
            ['--brillo' as string]: b.brillo,
            /* El recorrido va en px y no en %: la tarjeta mide distinto
               según lleve pie o no, y con % cada KPI tendría una lluvia
               de velocidad diferente. */
            ['--desde' as string]: '-34px',
            ['--hasta' as string]: '172px',
          }}
        >
          <div
            className="carril-vaiven"
            style={{
              animationDuration: `${b.vaiven}s`,
              animationDelay: `${b.retraso}s`,
              ['--deriva' as string]: `${b.deriva}px`,
            }}
          >
            <svg
              className="carril-voltear"
              width={b.ancho}
              height={b.ancho * PROPORCION}
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              fill="currentColor"
              style={{
                animationDuration: `${b.volteo}s`,
                animationDelay: `${b.retraso}s`,
              }}
            >
              <use href={`#billete-${b.detalle}`} />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── El dibujo ────────────────────────────────────────────────────────────
   Antes era un rectángulo redondeado con un círculo negro al centro: el
   icono universal de "aquí iba una imagen". Lo que lo vuelve dinero:

   · La ORLA grabada, un filete fino paralelo al borde. Es la señal más
     fuerte de las tres — ningún otro objeto rectangular la lleva.
   · La viñeta central va como óvalo HUECO, no como mancha rellena. Un
     círculo negro sólido no evoca un retrato, evoca un agujero.
   · Y la curvatura: el papel en el aire nunca está plano. El billete va
     combado y con las puntas a distinta altura, así que aun quieto parece
     que está cayendo.

   PROPORCIÓN: 1.9 a 1, no la 2.2 de un billete real. Medido con regla el
   dato es 2.2, pero a 30 px de ancho eso deja 13 px de alto y el billete
   deja de leerse como objeto: es una tira. Y como además va combado, el
   comba se come parte de esos 13 y termina de aplanarlo. Aquí gana la
   lectura sobre la exactitud.

   La comba también se bajó: iba al 16% del alto y a poco que el billete
   girara se veía un plátano en vez de un papel.

   Todo en UN path con evenodd, por la misma razón que las calaveras: los
   huecos son transparencia de verdad y el mismo dibujo sirve en los dos
   temas. El anidamiento de contornos alterna relleno y hueco, y de ahí sale
   la orla: silueta (relleno), orla exterior (hueco), orla interior (relleno
   otra vez), y encima la viñeta y las esquinas (huecos).                  */

const ANCHO = 44
const ALTO = 28
const PROPORCION = ALTO / ANCHO

const SILUETA = 'M2 5.5C14 3.6 30 3.3 42 3.5V22.5C30 22.3 14 22.6 2 24.5Z'

/* La orla, en dos grosores. No es que la chica lleve menos detalle: lleva
   el MISMO, más gordo. Un filete de 0.9 unidades a 24 px de ancho mide
   medio píxel y se deshace en un gris sucio, así que la de lejos se dibuja
   a 1.5 y sobrevive. Sin ella el billete chico quedaba en un rectángulo
   con un óvalo — una etiqueta, no dinero. */
const ORLA_EXTERIOR = 'M3.8 7.3C15 5.4 29.5 5.1 40.2 5.3V20.7C29.5 20.5 15 20.8 3.8 22.7Z'

const ORLA_FINA = ORLA_EXTERIOR + 'M4.7 8.2C15.5 6.3 29.5 6 39.3 6.2V19.8C29.5 19.6 15.5 19.9 4.7 21.8Z'

const ORLA_GRUESA =
  ORLA_EXTERIOR + 'M5.3 8.8C15.8 6.9 29.5 6.6 38.7 6.8V19.2C29.5 19 15.8 19.3 5.3 21.2Z'

const VINETA = 'M18.4 13.2a3.6 3.2 0 1 1 7.2 0 3.6 3.2 0 1 1-7.2 0Z'

/** Las cifras de las esquinas, sugeridas. A tamaño chico serían lodo. */
const ESQUINAS = 'M6.2 13.6h2v2h-2Z M35.8 12h2v2h-2Z'

const CHICO = SILUETA + ORLA_GRUESA + VINETA
const GRANDE = SILUETA + ORLA_FINA + VINETA + ESQUINAS

/**
 * Los dos dibujos, definidos UNA vez para todo el tablero.
 *
 * Va aparte y se monta en la página, no dentro de `<LluviaBilletes>`: hay
 * siete tarjetas con semáforo, así que ahí adentro se declararía siete
 * veces el mismo `id`. El navegador se queda con el primero y funciona de
 * casualidad, pero son ids duplicados en el documento y seis copias del
 * mismo path que nadie usa.
 */
export function DefinicionesBillete() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <path id="billete-chico" fillRule="evenodd" d={CHICO} />
        <path id="billete-grande" fillRule="evenodd" d={GRANDE} />
      </defs>
    </svg>
  )
}
