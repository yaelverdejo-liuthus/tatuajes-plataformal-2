/**
 * La calavera del estudio.
 *
 * Vive aquí y no dentro de la lluvia del login porque ya la usan dos
 * pantallas: cae de fondo en el login y guía el tutorial. Es la marca de la
 * casa, así que el dibujo se decide en un solo lugar.
 *
 * ── El dibujo ─────────────────────────────────────────────────────────
 * Un cráneo, no el emoji. La diferencia está casi entera en la silueta:
 *
 * · El punto más ancho de una calavera son los PÓMULOS, debajo de las
 *   cuencas — no la bóveda. El contorno baja de la frente, se estrecha en
 *   las sienes, vuelve a abrirse en el arco cigomático y recién ahí se
 *   cierra hacia la mandíbula. Ese pellizco-y-ensanche es lo que hace que
 *   se lea como hueso a 20 px; sin él queda una campana con dos agujeros.
 * · Las cuencas no son elipses: son trapecios redondeados, más anchos
 *   arriba, inclinados hacia afuera y hacia abajo, con el borde superior
 *   recto porque ahí apoya el arco de la ceja.
 * · La abertura nasal es un corazón invertido con la espina en el medio,
 *   no un triángulo.
 *
 * Todo va en UN solo path con fill-rule evenodd: cuencas, nariz, pómulos y
 * dientes son huecos de verdad y no formas pintadas del color del fondo.
 * Así el mismo dibujo sirve en claro y en oscuro sin saber qué hay detrás,
 * y por eso mismo el detalle interior no puede ir en paths aparte — encima
 * del cráneo y del mismo color, sería invisible.
 */

/* El trazo va de y=2.5 a y=70. El alto del viewBox lo ciñe dejando el mismo
   margen arriba y abajo: cualquier sobrante se traduce en calaveras que se
   ven más separadas entre sí de lo que en realidad están. */
export const ANCHO = 64
export const ALTO = 72.5
export const PROPORCION = ALTO / ANCHO

/* Los tres anchos que deciden si esto lee como hueso: bóveda 25, sien 23.2,
   pómulo 24.6. El orden importa más que los números — la sien tiene que
   perder contra sus dos vecinas para que se vea una cintura. Lo que no
   puede hacer el pómulo es ganarle a la bóveda: probado así, el arco sale
   por fuera del cráneo y lee como perilla pegada, no como hueso. La
   mandíbula cierra en 14; angostarla más la vuelve cuello de botella.    */
const SILUETA =
  'M32 2.5C45.8 2.5 57 12.4 57 25C57 29.4 55.2 30.6 55.2 33' +
  'C55.2 36 56.6 37.4 56.6 41.5C56.6 46 53.4 48.4 48.6 50' +
  'C46.8 50.6 46 52.2 46 54.5C46 60 45.2 63.8 43 66.6' +
  'C40.6 69.4 36.6 70 32 70C27.4 70 23.4 69.4 21 66.6' +
  'C18.8 63.8 18 60 18 54.5C18 52.2 17.2 50.6 15.4 50' +
  'C10.6 48.4 7.4 46 7.4 41.5C7.4 37.4 8.8 36 8.8 33' +
  'C8.8 30.6 7 29.4 7 25C7 12.4 18.2 2.5 32 2.5Z'

const ORBITAS =
  'M39.4 26.8c3.8-1.1 8.3-.9 10.4 1 1.7 1.5 1.5 5.5-.2 8.5-1.7 3-5.3 3.8-7.6 1.9-1.9-1.9-4.4-7.6-2.6-11.4Z' +
  'M24.6 26.8c-3.8-1.1-8.3-.9-10.4 1-1.7 1.5-1.5 5.5.2 8.5 1.7 3 5.3 3.8 7.6 1.9 1.9-1.9 4.4-7.6 2.6-11.4Z'

const NARIZ =
  'M32 41.6c1.2 2.2 4.6 5.4 5.4 8.2.5 1.8-.8 3-2.4 2.4-1.2-.4-2.2-1.6-3-3-.8 1.4-1.8 2.6-3 3-1.6.6-2.9-.6-2.4-2.4.8-2.8 4.2-6 5.4-8.2Z'

/* Los pómulos van como línea grabada —un hueco fino, no una sombra— porque
   es lo único que funciona sin saber el color del fondo. Es también como se
   dibuja el hueso en flash tradicional: contorno, no volumen. */
const POMULOS =
  'M51.4 41c-.5 3.5-2.6 6.3-5.7 8-.8.4-1.5.2-1.8-.4-.3-.6 0-1.3.7-1.7 2.5-1.4 4.2-3.6 4.8-6.4.2-.7.8-1.1 1.4-1 .6.2.7.8.6 1.5Z' +
  'M12.6 41c.5 3.5 2.6 6.3 5.7 8 .8.4 1.5.2 1.8-.4.3-.6 0-1.3-.7-1.7-2.5-1.4-4.2-3.6-4.8-6.4-.2-.7-.8-1.1-1.4-1-.6.2-.7.8-.6 1.5Z'

/* La dentadura, en dos mitades porque cuestan distinto de leer. Las ranuras
   de arriba miden 2 unidades y a 30 px eso es un píxel escaso: sobreviven.
   Las de abajo son más finas y solo entran en las de adelante — a tamaño
   medio se volvían un gris sucio y ensuciaban toda la mandíbula.

   La línea de la mordida sola no basta: sin las ranuras, una barra recta
   en medio de un maxilar vacío lee como ranura de alcancía. */
const MORDIDA = 'M23.8 59.4h16.4a.9.9 0 0 1 0 1.8H23.8a.9.9 0 0 1 0-1.8Z'

const DIENTES_ARRIBA = 'M27 55.6h2v3.6h-2Z M31 55.6h2v3.6h-2Z M35 55.6h2v3.6h-2Z'

const DIENTES_ABAJO = 'M28 61.4h1.8v3h-1.8Z M31.1 61.4h1.8v3.2h-1.8Z M34.2 61.4h1.8v3h-1.8Z'

export const LEJOS = SILUETA + ORBITAS + NARIZ
export const MEDIA = LEJOS + POMULOS + MORDIDA + DIENTES_ARRIBA
export const CERCA = MEDIA + DIENTES_ABAJO

export type Detalle = 'lejos' | 'media' | 'cerca'

const POR_DETALLE: Record<Detalle, string> = { lejos: LEJOS, media: MEDIA, cerca: CERCA }

/**
 * Los tres niveles de detalle, definidos UNA vez para quien vaya a pintar
 * muchas. Se monta en la página, no en cada instancia: la lluvia del login
 * dibuja catorce, y ahí adentro serían catorce ids repetidos.
 */
export function DefinicionesCalavera() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <path id="calavera-lejos" fillRule="evenodd" d={LEJOS} />
        <path id="calavera-media" fillRule="evenodd" d={MEDIA} />
        <path id="calavera-cerca" fillRule="evenodd" d={CERCA} />
      </defs>
    </svg>
  )
}

/* ── La que habla ─────────────────────────────────────────────────────────
   Para que la calavera hable hay que darle una mandíbula suelta. La de
   arriba va fundida en una sola pieza —a 20 px cayendo de fondo no hace
   falta más— pero una boca que se abre necesita dos huesos, y estirar el
   cráneo entero se ve como un globo, no como alguien hablando.

   El corte va por la línea de la mordida: arriba el cráneo con el maxilar
   y los dientes de arriba, abajo la mandíbula con los suyos. Cuando está
   cerrada quedan 1.4 unidades de separación entre las dos piezas, y eso
   mismo es la línea de la mordida — ya no hace falta dibujarla aparte.

   El hueco entre pieza y pieza deja ver el fondo, que es justo lo que se
   quiere: una boca abierta es un vacío oscuro, no una forma pintada.     */

const CRANEO_HABLA =
  'M32 2.5C45.8 2.5 57 12.4 57 25C57 29.4 55.2 30.6 55.2 33' +
  'C55.2 36 56.6 37.4 56.6 41.5C56.6 46 53.4 48.4 48.6 50' +
  'C46.8 50.6 46 52.2 46 54.5L46 59.6' +
  'C40 60.8 24 60.8 18 59.6L18 54.5' +
  'C18 52.2 17.2 50.6 15.4 50C10.6 48.4 7.4 46 7.4 41.5' +
  'C7.4 37.4 8.8 36 8.8 33C8.8 30.6 7 29.4 7 25C7 12.4 18.2 2.5 32 2.5Z' +
  ORBITAS +
  NARIZ +
  POMULOS +
  DIENTES_ARRIBA

const MANDIBULA =
  'M18.2 61C24 62.2 40 62.2 45.8 61' +
  'C45.2 64.4 44.6 65.6 43 66.6C40.6 69.4 36.6 70 32 70' +
  'C27.4 70 23.4 69.4 21 66.6C19.4 65.6 18.8 64.4 18.2 61Z' +
  'M27.9 62.8h1.8v2.6h-1.8Z M31.1 62.8h1.8v2.8h-1.8Z M34.2 62.8h1.8v2.6h-1.8Z'

/**
 * La calavera que guía el tutorial: flota, se ladea y habla.
 *
 * El ritmo de la mandíbula está en `calavera-hablar` (index.css) y es
 * deliberadamente irregular, con una pausa larga en medio. Una apertura
 * pareja y constante no se lee como hablar: se lee como masticar.
 */
export function CalaveraHablando({
  tamano = 84,
  className,
}: {
  tamano?: number
  className?: string
}) {
  return (
    <svg
      width={tamano}
      height={tamano * PROPORCION}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path fillRule="evenodd" d={CRANEO_HABLA} />
      <path className="calavera-mandibula" fillRule="evenodd" d={MANDIBULA} />
    </svg>
  )
}

/**
 * Una calavera suelta, con el path adentro y sin depender de que alguien
 * haya montado las definiciones. Para cuando se pinta una sola y armar la
 * indirección de <use> costaría más de lo que ahorra.
 */
export function Calavera({
  tamano = 96,
  className,
  detalle = 'cerca',
}: {
  tamano?: number
  className?: string
  detalle?: Detalle
}) {
  return (
    <svg
      width={tamano}
      height={tamano * PROPORCION}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path fillRule="evenodd" d={POR_DETALLE[detalle]} />
    </svg>
  )
}
