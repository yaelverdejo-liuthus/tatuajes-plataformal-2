import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { construirEngranaje, proyectar, rotar, type Pose } from '../lib/engranaje3d'

/**
 * ══ EL ENGRANAJE DE AJUSTES ═══════════════════════════════════════════
 *
 * Una pieza de barro extruida, renderizada como sólido, que entra
 * volteando y girando sobre sí misma y se va a acomodar en su esquina.
 *
 * ── Por qué esta pantalla sí se gana una animación de autor ───────────
 *
 * La primera pregunta del marco de Emil Kowalski no es "¿cómo lo animo?"
 * sino "¿cuántas veces al día se ve esto?". Los iconos del menú perdieron
 * su bucle por esa pregunta: se ven cientos de veces al día.
 *
 * Ajustes es el extremo contrario. Es solo de admin y sus 7 umbrales son
 * "supuestos de arranque" que se ponen una vez y casi no se vuelven a
 * tocar. En esa tabla de frecuencias, "raro / primera vez" es el único
 * renglón donde dice que se puede añadir encanto.
 *
 * ── Y no decora: arrastra ─────────────────────────────────────────────
 *
 * La pantalla lo dice con todas sus letras: cambiar un umbral recalcula el
 * filtro de contenido, el veredicto de pauta y los semáforos del tablero.
 * Esto es la maquinaria del sistema. Por eso el engranaje no aparece y ya:
 * GIRA, y las tarjetas entran durante su giro, escalonadas, como si el
 * giro las trajera. Una causa y un efecto, no dos animaciones que
 * coinciden en el tiempo.
 *
 * ── Por qué se pinta a mano en un canvas ──────────────────────────────
 *
 * Hubo dos versiones antes de ésta, las dos en CSS, y las dos se veían
 * planas. El diagnóstico completo está en lib/engranaje3d.ts; resumido:
 * una pila de copias planas insinúa grosor pero no puede tener luz sobre
 * las caras laterales, y ese cambio de brillo al girar es exactamente lo
 * que el ojo usa para decidir que algo es un sólido.
 *
 * Aquí cada cara tiene su normal y su sombreado. El precio es que corre
 * en el hilo principal; se paga porque dura 1.5s, termina, y no deja
 * ningún bucle. El VIAJE de la pieza sigue siendo CSS, fuera del hilo.
 *
 * ── Sigue sin ser requisito para nada ─────────────────────────────────
 *
 * Si el canvas no pinta, si el JS falla o si el sistema pide reducir
 * movimiento, se dibuja UNA vez en la pose de reposo. Ningún dato de esta
 * pantalla depende de que esto se anime.
 */

/** Cuánto mide la pieza mientras está en el centro, en px. */
const TAMANO_EN_CENTRO = 190

/** El tope de ampliación que tiene que aguantar el mapa de bits. */
const AMPLIACION_MAXIMA = 2.6

const DURACION = 1500

/**
 * La coreografía.
 *
 * Los ángulos son mucho más abiertos que en las versiones de CSS, y se
 * puede: con geometría real, ponerse casi de perfil enseña la pared
 * lateral en vez de hacer desaparecer la pieza, que es lo que le pasaba a
 * la pila de planos.
 *
 * El fotograma del 55% es el que hace el trabajo — ahí `ry` pasa por -64°
 * y se ve el canto entero por un lado. `rz` da una vuelta completa: gira
 * sobre su propia cara, pero ya no es lo único que se nota.
 */
const GUION: { t: number; pose: Pose }[] = [
  { t: 0, pose: { rx: 62, ry: 74, rz: -336, tz: -170, escala: 0.9, opacidad: 0 } },
  { t: 0.28, pose: { rx: 48, ry: 20, rz: -212, tz: -110, escala: 0.94, opacidad: 1 } },
  { t: 0.55, pose: { rx: 34, ry: -64, rz: -96, tz: -45, escala: 0.98, opacidad: 1 } },
  { t: 1, pose: { rx: 22, ry: -24, rz: 16, tz: 0, escala: 1, opacidad: 1 } },
]

/** La pose final, que es también la de reposo si nada se anima. */
const REPOSO = GUION[GUION.length - 1].pose

/**
 * `--vuelo`, la misma curva del CSS: reparte el recorrido en vez de
 * meterlo todo al principio. La ease-out de la interfaz concentra el 85%
 * del movimiento en el primer 30% del tiempo, y aplicada a algo que
 * existe para verse, lo mata.
 */
function vuelo(t: number) {
  // Bézier cúbica (0.36, 0.42, 0.2, 1), resuelta por bisección. Diez
  // iteraciones bastan de sobra a 60fps y evitan traer un solver.
  const bx = (u: number) => 3 * u * (1 - u) * (1 - u) * 0.36 + 3 * u * u * (1 - u) * 0.2 + u * u * u
  const by = (u: number) => 3 * u * (1 - u) * (1 - u) * 0.42 + 3 * u * u * (1 - u) * 1 + u * u * u
  let lo = 0
  let hi = 1
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    if (bx(mid) < t) lo = mid
    else hi = mid
  }
  return by((lo + hi) / 2)
}

const mezcla = (a: number, b: number, k: number) => a + (b - a) * k

function poseEn(t: number): Pose {
  if (t <= 0) return GUION[0].pose
  if (t >= 1) return REPOSO
  let i = 0
  while (i < GUION.length - 2 && t > GUION[i + 1].t) i++
  const a = GUION[i]
  const b = GUION[i + 1]
  const k = vuelo((t - a.t) / (b.t - a.t))
  return {
    rx: mezcla(a.pose.rx, b.pose.rx, k),
    ry: mezcla(a.pose.ry, b.pose.ry, k),
    rz: mezcla(a.pose.rz, b.pose.rz, k),
    tz: mezcla(a.pose.tz, b.pose.tz, k),
    escala: mezcla(a.pose.escala, b.pose.escala, k),
    opacidad: mezcla(a.pose.opacidad, b.pose.opacidad, k),
  }
}

/**
 * La luz.
 *
 * Viene de arriba a la izquierda y algo de frente, que es de donde viene
 * en TODO el sistema — la misma dirección que fija el degradado del
 * `body::before` y la que justifica que el filo vaya arriba y la pared en
 * sombra abajo. Un objeto iluminado desde otro sitio se ve pegado encima
 * de la escena, no dentro de ella.
 */
const LUZ: [number, number, number] = (() => {
  const v: [number, number, number] = [-0.42, -0.72, 0.55]
  const n = Math.hypot(v[0], v[1], v[2])
  return [v[0] / n, v[1] / n, v[2] / n]
})()

/** Cuánta luz hay aunque una cara no mire a la lámpara. Sin esto las caras
    a contraluz salen negras y el barro se ve de plástico. */
const AMBIENTE = 0.42

export function EngranajeArcilla({ className }: { className?: string }) {
  const hueco = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [viaje, setViaje] = useState<{ dx: number; dy: number; k: number } | null>(null)

  /*
   * Se mide en `useLayoutEffect` y no en `useEffect`: entre pintar la
   * pieza en su esquina y aplicarle el desplazamiento al centro hay un
   * fotograma, y en ese fotograma se vería aparecer en la esquina y
   * saltar al centro — justo al revés de lo que tiene que pasar.
   */
  useLayoutEffect(() => {
    const el = hueco.current
    if (!el) return
    const caja = el.getBoundingClientRect()
    if (!caja.width) return

    /*
     * El centro horizontal sale del ÁREA DE CONTENIDO, no del viewport:
     * en escritorio la barra lateral ocupa 256px fijos, así que el centro
     * de la ventana cae claramente a la izquierda de lo que se está
     * mirando. En móvil las dos medidas coinciden.
     *
     * El vertical sí sale del viewport: `main` crece con el contenido y
     * en una página larga su centro estaría muy por debajo de lo visible.
     */
    const contenido = el.closest('main')?.getBoundingClientRect()
    const centroX = contenido ? contenido.left + contenido.width / 2 : window.innerWidth / 2

    setViaje({
      dx: centroX - (caja.left + caja.width / 2),
      dy: window.innerHeight / 2 - (caja.top + caja.height / 2),
      k: TAMANO_EN_CENTRO / caja.width,
    })
  }, [])

  useEffect(() => {
    const canvas = lienzo.current
    const caja = hueco.current
    if (!canvas || !caja) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const modelo = construirEngranaje()

    /*
     * El mapa de bits se dimensiona para el tamaño MÁS GRANDE al que se
     * va a ver, no para el de la esquina. Durante el viaje el CSS lo
     * amplía hasta 2.6×, y un canvas de 88px estirado a 190 sale borroso.
     */
    const lado = caja.getBoundingClientRect().width || 88
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.round(lado * AMPLIACION_MAXIMA * dpr)
    canvas.width = px
    canvas.height = px

    /** Escala del modelo (radio 46 + holgura) al lienzo. */
    const unidad = px / 118

    /* El acento se lee EN CADA pintada, no una vez al montar. Es un token
       por tema, y leerlo una sola vez dejaba el engranaje con el color
       viejo al cambiar de tema — el único elemento de la app que no
       seguía el cambio. Una lectura de estilo calculado por fotograma
       durante 1.5s no se nota. */
    const leerAcento = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      const [r, g, b] = (v || '226 138 96').split(/\s+/).map(Number)
      return { r, g, b }
    }

    const pintar = (pose: Pose) => {
      const { r, g, b } = leerAcento()
      ctx.clearRect(0, 0, px, px)
      ctx.globalAlpha = pose.opacidad

      const aPantalla = (p: readonly [number, number, number]) => {
        const q = rotar(p as [number, number, number], pose.rx, pose.ry, pose.rz)
        const [sx, sy] = proyectar([q[0], q[1], q[2] + pose.tz], pose.escala)
        return [px / 2 + sx * unidad, px / 2 + sy * unidad] as const
      }

      const profundidad = (pts: readonly (readonly [number, number, number])[]) => {
        let z = 0
        for (const p of pts) {
          z += rotar(p as [number, number, number], pose.rx, pose.ry, pose.rz)[2]
        }
        return z / pts.length
      }

      const tono = (luz: number) =>
        `rgb(${Math.round(r * luz)} ${Math.round(g * luz)} ${Math.round(b * luz)})`

      const pintarContorno = (pts: readonly (readonly [number, number, number])[]) => {
        pts.forEach((p, i) => {
          const [x, y] = aPantalla(p)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.closePath()
      }

      /*
       * Una tapa se pinta con SU AGUJERO recortado, por regla par-impar.
       * Sin el recorte no se ve a través del barreno, y la pared interior
       * del barreno —que es el detalle que más vende el volumen, porque
       * es donde el desalineamiento entre las dos bocas se nota— queda
       * tapada por la propia tapa.
       */
      const pintarTapa = (
        contorno: readonly (readonly [number, number, number])[],
        hueco: readonly (readonly [number, number, number])[],
        normal: [number, number, number],
        realce: number,
      ) => {
        const n = rotar(normal, pose.rx, pose.ry, pose.rz)
        if (n[2] <= 0.02) return
        const difusa = Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2])
        const luz = AMBIENTE + (1 - AMBIENTE) * difusa + realce * Math.pow(Math.max(n[2], 0), 3)
        ctx.fillStyle = tono(luz)
        ctx.beginPath()
        pintarContorno(contorno)
        pintarContorno(hueco)
        ctx.fill('evenodd')
      }

      const pintarQuads = (caras: typeof modelo.paredes, atenuar: number) => {
        const visibles = caras
          .map((cara) => ({ cara, n: rotar(cara.normal, pose.rx, pose.ry, pose.rz), z: profundidad(cara.puntos) }))
          .filter(({ n }) => n[2] > 0.02)
          .sort((a, b) => a.z - b.z)

        for (const { cara, n } of visibles) {
          const difusa = Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2])
          ctx.fillStyle = tono((AMBIENTE + (1 - AMBIENTE) * difusa) * atenuar)
          ctx.beginPath()
          pintarContorno(cara.puntos)
          ctx.fill()
          /* Un trazo del mismo color y de un píxel tapa las costuras entre
             quads vecinos. Sin él aparece una retícula de líneas de fondo
             entre cara y cara: el artefacto de rasterizar polígonos
             adyacentes con antialias. */
          ctx.lineWidth = 1
          ctx.strokeStyle = ctx.fillStyle
          ctx.stroke()
        }
      }

      /*
       * ── El orden de pintado ──────────────────────────────────────
       *
       * En una extrusión el orden es DETERMINISTA y no hace falta
       * ordenar todo junto:
       *
       *   tapa de atrás → pared del barreno → pared exterior → tapa de
       *   delante
       *
       * La primera versión metía las 120 caras en un solo `sort` por
       * profundidad media, y salía rota: una tapa plana y las paredes que
       * la rodean tienen profundidad media casi idéntica, así que el
       * desempate era arbitrario y las paredes se pintaban ENCIMA de la
       * cara frontal. El resultado no parecía un engranaje sino un montón
       * de lajas apiladas.
       *
       * Dentro de cada grupo sí se ordena: entre dientes cercanos y
       * lejanos la diferencia de profundidad es real y grande.
       */
      pintarTapa(modelo.tapaAtras, modelo.huecoAtras, [0, 0, -1], 0)
      pintarQuads(modelo.barrenos, 0.62)
      pintarQuads(modelo.paredes, 1)
      // Realce corto en la cara de frente. Corto a propósito: el barro es
      // MATE, y un brillo marcado lo convierte en plástico.
      pintarTapa(modelo.tapaFrente, modelo.huecoFrente, [0, 0, 1], 0.08)

      ctx.globalAlpha = 1
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pintar(REPOSO)
      const obs = new MutationObserver(() => pintar(REPOSO))
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      return () => obs.disconnect()
    }

    let cuadro = 0
    let inicio = 0
    let terminado = false
    const paso = (ahora: number) => {
      if (!inicio) inicio = ahora
      const t = Math.min((ahora - inicio) / DURACION, 1)
      pintar(poseEn(t))
      if (t < 1) cuadro = requestAnimationFrame(paso)
      else terminado = true
    }
    cuadro = requestAnimationFrame(paso)

    /* El tema se cambia poniendo o quitando `.light` en <html>. Cuando eso
       pasa después de que la animación acabó, hay que repintar: el lienzo
       es un mapa de bits y no se entera solo de que cambió una variable
       CSS, a diferencia de todo lo demás en esta app. */
    const observador = new MutationObserver(() => {
      if (terminado) pintar(REPOSO)
    })
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelAnimationFrame(cuadro)
      observador.disconnect()
    }
  }, [])

  return (
    <div
      ref={hueco}
      className={className}
      aria-hidden
      /* Decorativo de principio a fin: mientras cruza la pantalla pasa por
         encima de las tarjetas, y no puede robarles un solo toque. */
      style={{ pointerEvents: 'none' }}
    >
      <div
        /* La clase solo cuando hay medida. Sin ella el `transform` del
           keyframe referencia variables que no existen, y una función
           inválida anula la propiedad entera. */
        className={viaje ? 'engranaje-viaje' : 'engranaje-quieto'}
        style={
          viaje
            ? ({
                '--vx': `${viaje.dx}px`,
                '--vy': `${viaje.dy}px`,
                '--k': viaje.k,
              } as React.CSSProperties)
            : undefined
        }
      >
        {/* La sombra de contacto: la cuarta capa del material. Sin ella la
            pieza flota. Entra tarde, cuando ya aterrizó — mientras cruza
            está en el aire y no se apoya en nada. */}
        <div className="engranaje-sombra" />
        <canvas ref={lienzo} className="engranaje-lienzo" />
      </div>
    </div>
  )
}
