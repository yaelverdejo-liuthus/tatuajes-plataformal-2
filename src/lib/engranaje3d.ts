/**
 * ══ UN ENGRANAJE SÓLIDO, PROYECTADO A MANO ════════════════════════════
 *
 * Geometría extruida de verdad: dos tapas, la pared exterior diente por
 * diente, y la pared del barreno. Cada cara se ilumina según hacia dónde
 * mira, así que al girar unas se aclaran y otras se apagan.
 *
 * ── Por qué esto y no CSS ────────────────────────────────────────────
 *
 * La versión anterior apilaba 26 copias planas del mismo dibujo en
 * `translateZ`. Insinúa grosor y no puede hacer más: las copias se
 * proyectan casi una encima de otra, así que el canto queda como un borde
 * emborronado en vez de una superficie, y —lo decisivo— ninguna copia
 * recibe luz distinta según su orientación. El ojo usa justo ese cambio
 * de brillo para decir "esto es un sólido girando". Sin él, por muchos
 * grados que rote, se lee plano.
 *
 * Aquí cada cara tiene su normal y su sombreado. Eso es lo que faltaba.
 *
 * ── Lo que se pierde y por qué se acepta ─────────────────────────────
 *
 * Deja de ser CSS, así que corre en el hilo principal. Se acepta porque
 * es una sola pantalla, solo de admin, que se abre poco, y porque la
 * animación DURA 1.5s y termina: no queda ningún bucle consumiendo nada.
 * Son ~120 caras ordenadas por profundidad en cada fotograma, que para un
 * navegador de 2026 no es nada.
 *
 * Sin dependencias. Meter una librería 3D serían ~150 kB comprimidos para
 * un icono decorativo, y la regla del proyecto es no añadir una
 * dependencia por un efecto que el stack ya puede expresar.
 */

export interface Pose {
  /** Grados. */
  rx: number
  ry: number
  rz: number
  /** Desplazamiento en profundidad, en unidades del modelo. */
  tz: number
  escala: number
  opacidad: number
}

type Vec3 = [number, number, number]

export interface Cara {
  puntos: Vec3[]
  /** Normal en el espacio del modelo. Se rota con la pieza. */
  normal: Vec3
  /** Qué es: cambia el color base. */
  tipo: 'pared' | 'barreno'
}

// ── El modelo ────────────────────────────────────────────────────────
//
// Todo en un espacio de 100 unidades, igual que el viewBox del SVG que
// esto reemplaza, para que los radios se lean igual.

const DIENTES = 11
const R_PUNTA = 46
const R_VALLE = 33
const R_BARRENO = 15
/** Media altura: la pieza va de -GROSOR a +GROSOR. */
const GROSOR = 13

/** Puntos por diente. Ocho da un flanco suficientemente curvo sin que la
    cuenta de caras se dispare: 11 × 8 = 88 quads de pared exterior. */
const MUESTRAS_POR_DIENTE = 8

const TAU = Math.PI * 2

/** Curva cuadrática, que es como está dibujado el perfil del diente. */
const cuad = (a: number, b: number, c: number, t: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c

/**
 * El contorno del engranaje, muestreado como polígono.
 *
 * Es el mismo perfil de dientes redondeados del dibujo anterior —el barro
 * no sostiene un canto vivo— pero evaluado a puntos en vez de escrito
 * como comandos de path.
 */
function contorno(): [number, number][] {
  const pts: [number, number][] = []
  const paso = TAU / DIENTES

  for (let i = 0; i < DIENTES; i++) {
    const a0 = i * paso
    for (let m = 0; m < MUESTRAS_POR_DIENTE; m++) {
      const t = m / MUESTRAS_POR_DIENTE
      // Cuatro tramos por diente: sube, cruza la punta, baja, cruza el valle.
      let ang: number
      let rad: number
      if (t < 0.25) {
        const u = t / 0.25
        ang = a0 + paso * cuad(0.08, 0.17, 0.3, u)
        rad = cuad(R_VALLE, (R_PUNTA + R_VALLE) / 2, R_PUNTA, u)
      } else if (t < 0.5) {
        const u = (t - 0.25) / 0.25
        ang = a0 + paso * cuad(0.3, 0.5, 0.7, u)
        rad = cuad(R_PUNTA, R_PUNTA * 1.06, R_PUNTA, u)
      } else if (t < 0.75) {
        const u = (t - 0.5) / 0.25
        ang = a0 + paso * cuad(0.7, 0.83, 0.92, u)
        rad = cuad(R_PUNTA, (R_PUNTA + R_VALLE) / 2, R_VALLE, u)
      } else {
        const u = (t - 0.75) / 0.25
        ang = a0 + paso * cuad(0.92, 1, 1.08, u)
        rad = cuad(R_VALLE, R_VALLE * 0.94, R_VALLE, u)
      }
      pts.push([rad * Math.cos(ang), rad * Math.sin(ang)])
    }
  }
  return pts
}

function barreno(): [number, number][] {
  const n = 28
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU
    return [R_BARRENO * Math.cos(a), R_BARRENO * Math.sin(a)] as [number, number]
  })
}

export interface Engranaje {
  /** Contorno exterior, en la cara de delante y en la de atrás. */
  tapaFrente: Vec3[]
  tapaAtras: Vec3[]
  huecoFrente: Vec3[]
  huecoAtras: Vec3[]
  /** Un quad por segmento del contorno, cada uno con su normal. */
  paredes: Cara[]
  /** Ídem para el barreno, con la normal hacia dentro. */
  barrenos: Cara[]
}

/**
 * Construye la geometría una sola vez.
 *
 * Las tapas se devuelven como contornos sueltos —no como `Cara`— porque
 * se pintan distinto: con el agujero recortado por regla par-impar, para
 * que a través del barreno se vea su pared interior. Una tapa maciza
 * taparía justo el detalle que más vende el volumen.
 */
export function construirEngranaje(): Engranaje {
  const perfil = contorno()
  const hueco = barreno()

  const aCara = (
    puntos: [number, number][],
    haciaDentro: boolean,
  ): Cara[] =>
    puntos.map((_, i) => {
      const [x1, y1] = puntos[i]
      const [x2, y2] = puntos[(i + 1) % puntos.length]
      const dx = x2 - x1
      const dy = y2 - y1
      const largo = Math.hypot(dx, dy) || 1
      const signo = haciaDentro ? -1 : 1
      return {
        puntos: [
          [x1, y1, GROSOR],
          [x2, y2, GROSOR],
          [x2, y2, -GROSOR],
          [x1, y1, -GROSOR],
        ] as Vec3[],
        normal: [(signo * dy) / largo, (-signo * dx) / largo, 0] as Vec3,
        tipo: haciaDentro ? ('barreno' as const) : ('pared' as const),
      }
    })

  return {
    tapaFrente: perfil.map(([x, y]) => [x, y, GROSOR] as Vec3),
    tapaAtras: perfil.map(([x, y]) => [x, y, -GROSOR] as Vec3),
    huecoFrente: hueco.map(([x, y]) => [x, y, GROSOR] as Vec3),
    huecoAtras: hueco.map(([x, y]) => [x, y, -GROSOR] as Vec3),
    paredes: aCara(perfil, false),
    barrenos: aCara(hueco, true),
  }
}

// ── Rotación ─────────────────────────────────────────────────────────
//
// Se aplica Z, luego Y, luego X: el mismo orden que CSS resuelve para
// `rotateX() rotateY() rotateZ()`, donde el último de la cadena actúa
// primero, en el marco local de la pieza. Así `rz` sigue siendo "girar
// sobre su propia cara".

const grados = (d: number) => (d * Math.PI) / 180

export function rotar([x, y, z]: Vec3, rx: number, ry: number, rz: number): Vec3 {
  const cz = Math.cos(grados(rz))
  const sz = Math.sin(grados(rz))
  let a = x * cz - y * sz
  let b = x * sz + y * cz
  let c = z

  const cy = Math.cos(grados(ry))
  const sy = Math.sin(grados(ry))
  const a2 = a * cy + c * sy
  const c2 = -a * sy + c * cy
  a = a2
  c = c2

  const cx = Math.cos(grados(rx))
  const sx = Math.sin(grados(rx))
  const b2 = b * cx - c * sx
  const c3 = b * sx + c * cx

  return [a, b2, c3]
}

/** Distancia de la cámara, en unidades del modelo. Corta a propósito: es
    lo que produce escorzo y hace que un giro se lea como profundidad. */
const CAMARA = 210

export function proyectar([x, y, z]: Vec3, escala: number): [number, number] {
  const k = (CAMARA / (CAMARA - z)) * escala
  return [x * k, y * k]
}
