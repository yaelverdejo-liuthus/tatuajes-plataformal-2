import { useMemo } from 'react'
import { useQuieto } from '../hooks/useQuieto'
import {
  ALTO,
  ANCHO,
  DefinicionesCalavera,
  PROPORCION,
  type Detalle,
} from './ui/Calavera'

/**
 * Lluvia de calaveras del login.
 *
 * Va en CSS y no en framer a propósito: son animaciones infinitas y de
 * duración larga, y framer las recalcularía en JS en cada frame para
 * siempre. En CSS las mueve el compositor y no cuestan hilo principal —
 * importa porque el login es lo primero que abre un teléfono de gama baja.
 *
 * Cada calavera son dos capas anidadas con animaciones independientes: la
 * de fuera cae y gira, la de dentro se mece de lado a lado. Combinarlas en
 * un solo `transform` obligaría a sincronizar ambos ritmos, y es justo el
 * desfase entre los dos lo que hace que se vea como una pluma cayendo y no
 * como algo que baja en línea recta.
 *
 * El dibujo vive en <defs> una sola vez y cada calavera es un <use>. Antes
 * el path iba repetido en las catorce: el mismo trazo catorce veces en el
 * DOM, y cambiar una coma obligaba a confiar en que las catorce copias
 * seguían siendo idénticas.
 */

const CANTIDAD = 14

/** Debajo de este tamaño en px, el detalle interior se vuelve lodo. */
const UMBRAL_MEDIA = 30
const UMBRAL_CERCA = 42

interface Calavera {
  id: number
  izquierda: number
  tamano: number
  caida: number
  retraso: number
  vaiven: number
  deriva: number
  giro: number
  brillo: number
  desenfoque: number
  ancho: number
  calida: boolean
  detalle: Detalle
}

const entre = (min: number, max: number) => min + Math.random() * (max - min)

const barajar = <T,>(lista: T[]): T[] => {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function generar(): Calavera[] {
  // Ni la posición ni el momento de la caída son azar puro: el azar
  // uniforme amontona. Con catorce tiros libres siempre salen dos pegadas
  // —y dos calaveras encimadas se leen como una mancha, no como dos
  // objetos— y quedan huecos grandes al lado. Se reparte una por carril y
  // se sortea dentro del carril: separación garantizada, sin la regla
  // visible de una grilla.
  const FRANJA = 108 / CANTIDAD
  // Las fases van barajadas contra los carriles a propósito. Usar el mismo
  // índice para el carril y para el momento de la caída alinea las catorce
  // sobre una diagonal, que es un patrón mucho más delator que el amontone
  // que vinimos a arreglar.
  const fases = barajar(Array.from({ length: CANTIDAD }, (_, i) => i))

  return Array.from({ length: CANTIDAD }, (_, id) => {
    // La profundidad manda sobre todo lo demás: las de atrás son chicas,
    // pálidas, lentas y borrosas; las de adelante grandes, nítidas y
    // rápidas. Sin esa correlación se ve como calcomanías en un solo plano.
    const profundidad = Math.random()
    const tamano = 21 + profundidad * 33
    const caida = 52 - profundidad * 20
    // Pocas y solo cerca: leídas como las que alcanzan a agarrar la luz
    // cálida del estudio, no como confeti de colores.
    const calida = profundidad > 0.68 && Math.random() < 0.55

    return {
      id,
      izquierda: -4 + id * FRANJA + entre(0.5, FRANJA - 0.5),
      tamano,
      caida,
      // Retraso NEGATIVO: la animación arranca a media caída, así que la
      // pantalla ya aparece poblada. Con retrasos positivos el login se ve
      // vacío los primeros veinte segundos, que es justo cuando alguien lo
      // está mirando.
      retraso: -caida * ((fases[id] + Math.random()) / CANTIDAD),
      vaiven: entre(3.5, 7),
      deriva: 10 + profundidad * 22,
      giro: entre(-150, 150),
      // El factor de las cálidas no es capricho: un tono saturado pesa más
      // que un gris a la misma opacidad. Igualadas por número, las cálidas
      // se leían como manchas de óxido y las neutras como polvo.
      brillo: (0.055 + profundidad * 0.105) * (calida ? 0.72 : 1),
      // Profundidad de campo: lo que está lejos no está solo más chico y
      // más pálido, está fuera de foco. Es el desenfoque, más que el
      // tamaño, lo que impide que las catorce se lean en un mismo plano.
      // Tope bajo a propósito: el filtro se rasteriza una vez por elemento
      // y de ahí en adelante lo único que se mueve es el transform.
      desenfoque: (1 - profundidad) * 0.65,
      // Ni dos cráneos humanos son igual de anchos. Sin esta variación las
      // catorce son el mismo sello repetido, que es justo lo que delata a
      // un fondo generado.
      ancho: [0.94, 1, 1.06][Math.floor(Math.random() * 3)],
      calida,
      detalle: tamano < UMBRAL_MEDIA ? 'lejos' : tamano < UMBRAL_CERCA ? 'media' : 'cerca',
    }
  })
}

export function LluviaCalaveras() {
  // Se siembran una sola vez: si se regeneraran en cada render, cada
  // pulsación en el formulario reiniciaría toda la lluvia desde arriba.
  const calaveras = useMemo(() => generar(), [])

  // Se para sola si la pestaña se va al fondo. En el login no hay scroll
  // que la saque de pantalla, pero sí una pestaña que se queda abierta.
  const { ref, quieto } = useQuieto<HTMLDivElement>()

  return (
    <div ref={ref} data-quieto={quieto} className="lluvia" aria-hidden>
      <DefinicionesCalavera />

      {calaveras.map((c) => (
        <div
          key={c.id}
          className="carril-caida"
          style={{
            left: `${c.izquierda}%`,
            animationDuration: `${c.caida}s`,
            animationDelay: `${c.retraso}s`,
            ['--giro' as string]: `${c.giro}deg`,
            ['--brillo' as string]: c.brillo,
          }}
        >
          <div
            className="carril-vaiven"
            style={{
              animationDuration: `${c.vaiven}s`,
              animationDelay: `${c.retraso}s`,
              ['--deriva' as string]: `${c.deriva}px`,
            }}
          >
            <svg
              width={c.tamano}
              height={c.tamano * PROPORCION}
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              fill="currentColor"
              className={c.calida ? 'text-accent' : 'text-fg'}
              style={{
                transform: `scaleX(${c.ancho})`,
                filter: c.desenfoque > 0.08 ? `blur(${c.desenfoque.toFixed(2)}px)` : undefined,
              }}
            >
              <use href={`#calavera-${c.detalle}`} />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
