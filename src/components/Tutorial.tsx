import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useMisPreferencias, useGuardarPreferencias } from '../lib/queries/preferencias'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'
import { CalaveraHablando } from './ui/Calavera'
import { cn } from '../lib/cn'
import type { Rol } from '../lib/tipos'

interface Paso {
  titulo: string
  texto: string
  /** Ruta a la que se mueve la app antes de hablar de esto. */
  ruta?: string
  /** Valor de data-tour del elemento que se ilumina. Sin esto, va al centro. */
  objetivo?: string
}

const APERTURA: Paso[] = [
  {
    titulo: 'Hola, soy tu asistente',
    texto:
      'Te voy a dar un recorrido por la plataforma. Me tardo un minuto, y así no se te escapa nada de lo importante.',
  },
  {
    titulo: 'Empieza siempre por aquí',
    texto:
      'Este panel te dice qué requiere atención hoy: seguimientos vencidos, trabajos sin anticipo, videos que ya merecen presupuesto. Si está vacío, vas al corriente.',
    ruta: '/',
    objetivo: 'atencion',
  },
  {
    titulo: 'Así te mueves',
    texto:
      'Desde aquí llegas a todo. En el celular es la barra de abajo, y lo que no cabe está en "Más". En computadora es este menú.',
    objetivo: 'nav',
  },
]

/** El cierre cambia según quién pregunta: al admin no se le dice "dile al admin". */
function cierrePara(rol: Rol): Paso[] {
  return [
    {
      titulo: 'Eso es todo',
      texto:
        rol === 'admin'
          ? 'Tú tienes acceso a todo. Si a alguien del equipo le falta algo, no está descompuesto: es su rol. Y si quieres volver a ver esto, está en "Ver tutorial", aquí mismo en el menú.'
          : 'Si la app no te deja hacer algo que crees que sí deberías, dile al admin. Y si quieres volver a ver esto, está en "Ver tutorial", aquí mismo en el menú.',
      objetivo: 'nav',
    },
  ]
}

const POR_ROL: Record<Rol, Paso[]> = {
  tatuador: [
    {
      titulo: 'Trabajos es tu pantalla',
      texto:
        'Aquí vive el expediente de cada pieza. Agenda te ordena por urgencia — lo vencido primero, luego hoy y la semana. Tablero los agrupa por estatus, e Historial guarda lo terminado para que no estorbe.',
      ruta: '/trabajos',
      objetivo: 'vistas-trabajos',
    },
    {
      titulo: 'Desde aquí das de alta',
      texto:
        'Este botón abre el formulario. Ahí adentro vas a ver las dos citas por separado: la de trazado, que son 20 minutos con marcador sobre el cuerpo, y la de tatuaje, que es la sesión.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Sin anticipo no hay cita',
      texto:
        'En ese mismo formulario no vas a poder marcar "agendado" ni "terminado" si no hay anticipo cobrado. No es la pantalla siendo necia: lo bloquea la base de datos, por eso no se puede saltar ni un martes a las nueve de la noche.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Captura los tiempos',
      texto:
        'Anota cuánto tardaste diseñando y cuánto aplicando, en horas y minutos tal cual — ya no hay que convertir nada. De ahí sale la tarifa real por hora, que es lo único que te dice si el nivel 3 de verdad paga mejor. El diseño pasa de noche y se siente gratis, pero no lo es.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'De aquí sale la cotización',
      texto:
        'Los diseños con su nivel, precio y zona. Si la zona es mano, el retoque va incluido a fuerza: esa piel retiene mal la tinta y si no está en el precio desde el principio, se termina regalando.',
      ruta: '/catalogo',
      objetivo: 'catalogo',
    },
  ],

  contenido: [
    {
      titulo: 'Contenido es tu pantalla',
      texto:
        'Con este botón registras cada video que publiques. Toma menos de 30 segundos y se puede hacer desde la calle.',
      ruta: '/contenido',
      objetivo: 'nuevo-video',
    },
    {
      titulo: 'Vuelve a las 4 horas',
      texto:
        'Ese es el dato que importa: vistas y guardados a las 4 horas de publicar. Se editan tocando el número directo en la tarjeta, sin abrir ningún formulario.',
      objetivo: 'nuevo-video',
    },
    {
      titulo: 'El filtro decide, no el gusto',
      texto:
        'Con estos filtros ves cuáles ya pasaron. Si un video trae el badge verde, funcionó solo — y es el único al que vale la pena meterle dinero. Promocionar algo en frío cuesta de 3 a 5 veces más.',
      objetivo: 'filtros-contenido',
    },
    {
      titulo: 'El catálogo también es tuyo',
      texto:
        'Puedes editar los diseños y subirles foto desde el celular. Eres quien tiene las fotos buenas a la mano, así que no hace falta pedirle a nadie que las suba por ti.',
      ruta: '/catalogo',
      objetivo: 'catalogo',
    },
    {
      titulo: 'Lo que no vas a poder tocar',
      texto:
        'Leads y Pauta los puedes ver, pero no escribir: son del admin. Si intentas guardar aquí, la base te lo va a rechazar. No está descompuesto, es a propósito.',
      ruta: '/ads',
    },
  ],

  /*
   * El admin ve el recorrido completo, no un resumen: es el rol de quien
   * más usa la plataforma, así que necesita tanto lo del taller (trabajos,
   * catálogo) como lo que solo él puede tocar (leads, pauta, umbrales).
   */
  admin: [
    {
      titulo: 'Trabajos es tu pantalla',
      texto:
        'Aquí vive el expediente de cada pieza. Agenda te ordena por urgencia — lo vencido primero, luego hoy y la semana. Tablero los agrupa por estatus, e Historial guarda lo terminado para que no estorbe.',
      ruta: '/trabajos',
      objetivo: 'vistas-trabajos',
    },
    {
      titulo: 'Desde aquí das de alta',
      texto:
        'Este botón abre el formulario. Ahí adentro vas a ver las dos citas por separado: la de trazado, que son 20 minutos con marcador sobre el cuerpo, y la de tatuaje, que es la sesión.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Sin anticipo no hay cita',
      texto:
        'No vas a poder marcar "agendado" ni "terminado" si no hay anticipo cobrado. Y ojo: ser admin no te salta esta regla. No es un permiso, es un candado de la base de datos — aplica igual para todos, incluido tú. Justo por eso sirve.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Captura los tiempos',
      texto:
        'Anota cuánto tardaste diseñando y cuánto aplicando, en horas y minutos tal cual — ya no hay que convertir nada. De ahí sale la tarifa real por hora, que es lo único que te dice si el nivel 3 de verdad paga mejor. El diseño pasa de noche y se siente gratis, pero no lo es.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'De aquí sale la cotización',
      texto:
        'Los diseños con su nivel, precio y zona. Si la zona es mano, el retoque va incluido a fuerza: esa piel retiene mal la tinta y si no está en el precio desde el principio, se termina regalando.',
      ruta: '/catalogo',
      objetivo: 'catalogo',
    },
    {
      titulo: 'Todo el que escribe, entra aquí',
      texto:
        'Cada persona que manda WhatsApp se registra el mismo día. Al moverlo de etapa, el asistente te pide justo lo que falta: si lo mandas directo a agendado sin haberlo cotizado, te cobra la cotización ahí mismo. Y cuando queda agendado, su trabajo se crea solo.',
      ruta: '/leads',
      objetivo: 'nuevo-lead',
    },
    {
      titulo: 'La pauta se mide, no se adivina',
      texto:
        'Cada campaña lleva su presupuesto y sus creativos, y cada creativo el suyo. Capturas gasto y conversaciones por día, y al entrar a la campaña ves el desglose por creativo con el veredicto de cuál escalar y cuál matar. Sin esto, en tres semanas cada quien tiene su teoría y ninguna es verificable.',
      ruta: '/ads',
      objetivo: 'nueva-pauta',
    },
    {
      titulo: 'Los 7 umbrales',
      texto:
        'Estos números mueven todo lo demás: el filtro de contenido, los umbrales de costo por conversación y la tarifa objetivo. Cambiarlos recalcula los semáforos y los veredictos al instante. Son supuestos de arranque — ajústalos cuando tengas datos reales.',
      ruta: '/config',
      objetivo: 'umbrales',
    },
  ],
}

function pasosPara(rol: Rol): Paso[] {
  return [...APERTURA, ...POR_ROL[rol], ...cierrePara(rol)]
}

interface Caja {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Entre duplicados responsive (sidebar y barra inferior), gana el visible.
 *
 * Se mide con offsetWidth y no con getBoundingClientRect: el botón flotante
 * entra animándose desde scale 0, y el rect de un elemento a media escala
 * da ancho 0 — lo descartaría justo cuando acaba de aparecer. offsetWidth
 * ignora los transforms; display:none sigue dando 0, que es lo que sí
 * queremos filtrar. Nada de offsetParent: da null en elementos position
 * fixed, y tanto el sidebar como el botón flotante lo son.
 */
function buscarVisible(objetivo: string): HTMLElement | null {
  const todos = [...document.querySelectorAll<HTMLElement>(`[data-tour="${objetivo}"]`)]
  return todos.find((el) => el.offsetWidth > 0) ?? null
}

const MARGEN = 12
const SEPARACION = 14

/**
 * Lo que hay que dejar libre abajo en móvil: la barra de navegación (4rem)
 * y el botón flotante que se apoya encima (3.5rem), más aire.
 *
 * Sin esto la invitación se sentaba justo sobre los dos y tapaba la
 * navegación de la app — que es exactamente lo que se buscaba evitar al
 * quitarle el velo. Un cuadro que no bloquea pero se para encima del menú
 * bloquea igual.
 */
const GUARNICION_MOVIL = 132

export function Tutorial({
  solicitado,
  onCerrarSolicitado,
}: {
  solicitado: boolean
  onCerrarSolicitado: () => void
}) {
  const { rol } = useRol()
  const { perfil } = useAuth()
  const { data: prefs, isPending } = useMisPreferencias()
  const guardar = useGuardarPreferencias()
  const navegar = useNavigate()

  const [fase, setFase] = useState<'oculto' | 'pregunta' | 'pasos' | 'fin'>('oculto')
  const [i, setI] = useState(0)
  const [caja, setCaja] = useState<Caja | null>(null)
  const [alto, setAlto] = useState(260)
  const yaPreguntado = useRef(false)
  const refUnidad = useRef<HTMLDivElement>(null)

  const pasos = rol ? pasosPara(rol) : []
  const paso = pasos[i]
  const enRecorrido = fase === 'pasos'

  /*
   * Se ofrece una vez por apertura de la app, a cualquier rol — el admin
   * incluido, que antes quedaba fuera y nunca llegaba a verlo.
   *
   * Se dispara al abrir y no solo al escribir la contraseña: la sesión dura
   * días, así que casi nadie pasa por el formulario de login. Atarlo a eso
   * era garantizar que no saliera nunca.
   *
   * La única forma de silenciarlo es "No volver a preguntar", que apaga
   * `mostrar_tutorial` en la base. Un "No" suelto solo lo cierra por hoy.
   */
  useEffect(() => {
    if (isPending || yaPreguntado.current) return
    // La marca se pone solo cuando de verdad se ofrece. Si se pusiera antes
    // de mirar `prefs`, un render con las preferencias todavía en camino
    // gastaría el único disparo y el asistente no saldría nunca.
    if (!prefs?.mostrar_tutorial) return
    yaPreguntado.current = true
    setFase('pregunta')
  }, [isPending, prefs?.mostrar_tutorial])

  useEffect(() => {
    if (solicitado) {
      setI(0)
      setFase('pasos')
    }
  }, [solicitado])

  // Mover la app a la pantalla de la que toca hablar.
  useEffect(() => {
    if (enRecorrido && paso?.ruta) navegar(paso.ruta)
  }, [enRecorrido, paso?.ruta, navegar])

  const medir = useCallback(() => {
    if (!enRecorrido || !paso?.objetivo) {
      setCaja(null)
      return
    }
    const el = buscarVisible(paso.objetivo)
    if (!el) {
      setCaja(null)
      return
    }
    const r = el.getBoundingClientRect()
    setCaja({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [enRecorrido, paso?.objetivo])

  /*
   * El elemento puede no existir todavía si acabamos de cambiar de ruta:
   * se le da un respiro para que pinte, se acerca a la vista, y recién
   * entonces se mide. Si aun así no aparece, `caja` queda en null y el
   * asistente se planta en el centro en vez de apuntar a la nada.
   */
  useEffect(() => {
    if (!enRecorrido) return
    let vivo = true

    const t1 = window.setTimeout(() => {
      if (!vivo) return
      const el = paso?.objetivo ? buscarVisible(paso.objetivo) : null
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      window.setTimeout(() => {
        if (vivo) medir()
      }, 380)
    }, 140)

    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      vivo = false
      window.clearTimeout(t1)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [enRecorrido, i, paso?.objetivo, medir])

  useLayoutEffect(() => {
    const el = refUnidad.current
    if (el) setAlto(el.getBoundingClientRect().height)
  }, [fase, i])

  function cerrar() {
    setFase('oculto')
    setI(0)
    setCaja(null)
    onCerrarSolicitado()
  }

  const visible = fase !== 'oculto' && pasos.length > 0

  // ── Dónde se para el asistente ──────────────────────────────────────
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const ancho = Math.min(vw - MARGEN * 2, 430)

  /*
   * La invitación se para abajo a la derecha, no en el centro. Un cuadro
   * en medio de la pantalla es una barrera aunque no tenga velo: tapa
   * justo lo que la persona vino a leer. Desde la esquina se ve, se puede
   * ignorar, y se sigue trabajando con la app entera visible.
   *
   * En pantallas angostas se pega al fondo ocupando el ancho disponible:
   * ahí una esquina flotante taparía media vista igual.
   */
  const angosta = vw < 640
  let x = angosta ? MARGEN : vw - ancho - MARGEN
  let y = vh - alto - MARGEN - (angosta ? GUARNICION_MOVIL : 0)
  let flecha: 'arriba' | 'abajo' | null = null

  if (enRecorrido && !caja) {
    x = (vw - ancho) / 2
    y = (vh - alto) / 2
  }

  if (enRecorrido && caja) {
    const centro = caja.left + caja.width / 2
    x = Math.min(Math.max(centro - ancho / 2, MARGEN), vw - ancho - MARGEN)

    const debajo = caja.top + caja.height + SEPARACION
    if (debajo + alto + MARGEN <= vh) {
      y = debajo
      flecha = 'arriba'
    } else {
      y = Math.max(MARGEN, caja.top - alto - SEPARACION)
      flecha = 'abajo'
    }
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <Fragment key="tutorial">
          {/* Bloquea la app de abajo. Cuando hay reflector, el oscurecido lo
              pone la sombra del reflector, no esta capa.

              SOLO durante el recorrido. La pregunta de si quieres el
              tutorial no bloquea nada: es una oferta, no una tarea, y
              llegaba con velo negro al 72% cada vez que se abría la app.
              Quien solo venía a ver cuánto debe un cliente tenía que
              contestar un cuestionario primero, y la única salida
              definitiva era el tercer botón. El recorrido sí se queda con
              velo: ahí el foco protegido es el punto, y además lo pediste
              tú. */}
          {enRecorrido && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70]"
              style={{ background: caja ? 'transparent' : 'rgb(0 0 0 / 0.72)' }}
            />
          )}

          {/* Reflector: el "hueco" lo hace una sombra enorme alrededor. */}
          {caja && (
            <div
              className="pointer-events-none fixed z-[71] rounded-2xl ring-2 ring-primary/70"
              style={{
                top: caja.top - 6,
                left: caja.left - 6,
                width: caja.width + 12,
                height: caja.height + 12,
                boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.72)',
                transition:
                  'top 480ms cubic-bezier(0.22,1,0.36,1), left 480ms cubic-bezier(0.22,1,0.36,1), width 480ms cubic-bezier(0.22,1,0.36,1), height 480ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          )}

          {/* El asistente y su globo, viajando de un elemento a otro */}
          <motion.div
            ref={refUnidad}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            /* El desplazamiento va por CSS y no por framer: framer solo
               escribe transform cuando anima x/y/scale, y aquí necesitamos
               que el translate mande sin pelearse con la animación de
               entrada. */
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: ancho,
              transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
              transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="z-[72]"
            role="dialog"
            /* Modal solo en el recorrido. Anunciar la invitación como modal
               sería mentirle a quien usa lector de pantalla: le diría que
               el resto de la app está inerte cuando sigue disponible. */
            aria-modal={enRecorrido ? true : undefined}
            aria-label={enRecorrido ? 'Tutorial' : 'Tutorial disponible'}
          >
            <div className="flex items-end gap-1.5">
              <div className="relative min-w-0 flex-1 rounded-2xl bg-surface p-4 shadow-arcilla-alta">
                {/* Piquito del globo, apuntando al elemento iluminado */}
                {flecha && caja && (
                  <span
                    className={cn(
                      'absolute h-3 w-3 rotate-45 bg-surface',
                      flecha === 'arriba'
                        ? '-top-1.5 border-l'
                        : '-bottom-1.5 border-b border-r border-line',
                    )}
                    style={{
                      left: Math.min(
                        Math.max(caja.left + caja.width / 2 - x - 6, 20),
                        ancho - 130,
                      ),
                    }}
                  />
                )}

                {fase === 'pregunta' && (
                  <>
                    {/* Cerrar explícito. Ya no hay velo que tocar por fuera
                        para quitárselo de encima, así que la salida tiene
                        que estar dentro y a la vista. */}
                    <button
                      type="button"
                      onClick={cerrar}
                      aria-label="Cerrar"
                      className="absolute right-2 top-2 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>

                    <h2 className="font-display pr-7 text-lg font-semibold tracking-tight text-fg">
                      {perfil?.nombre
                        ? `${perfil.nombre.split(' ')[0]}, ¿te doy un recorrido?`
                        : '¿Te doy un recorrido?'}
                    </h2>
                    <p className="mt-1 text-sm text-fg-muted">
                      Menos de dos minutos, y solo lo que te toca a ti.
                    </p>

                    {/* En fila y sin ocupar todo el ancho: tres botones
                        apilados a lo largo daban a esto el peso de una
                        decisión importante, y es una oferta que se puede
                        ignorar. */}
                    <div className="mt-3.5 flex items-center gap-2">
                      <Button onClick={() => setFase('pasos')}>Sí, muéstrame</Button>
                      <Button variante="fantasma" onClick={cerrar}>
                        Ahora no
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        guardar.mutate({ mostrar_tutorial: false })
                        cerrar()
                      }}
                      className="mt-2.5 text-xs text-fg-subtle underline-offset-2 transition-colors hover:text-fg-muted hover:underline"
                    >
                      No volver a preguntar
                    </button>
                  </>
                )}

                {fase === 'pasos' && paso && (
                  <>
                    <div className="flex items-center gap-1.5">
                      {pasos.map((_, n) => (
                        <span
                          key={n}
                          className={cn(
                            /* Propiedades nombradas y no `all`: con `all`
                               el navegador vigila cada propiedad que pueda
                               cambiar, y basta que una tercera se mueva
                               para que se anime sola sin que nadie lo
                               pidiera. Y 200ms, no 300: 300 es el techo de
                               lo aceptable en UI, y esto es un punto. */
                            'h-1 rounded-full transition-[width,background-color] duration-200 ease-out',
                            n === i ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong',
                          )}
                        />
                      ))}
                    </div>

                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-3"
                    >
                      <h2 className="text-lg font-semibold tracking-tight text-fg">
                        {paso.titulo}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{paso.texto}</p>
                    </motion.div>

                    <div className="mt-4 flex items-center gap-2">
                      {i > 0 && (
                        <Button
                          tamano="sm"
                          variante="secundario"
                          onClick={() => setI((n) => n - 1)}
                        >
                          Atrás
                        </Button>
                      )}
                      <Button
                        tamano="sm"
                        className="flex-1"
                        onClick={() =>
                          i < pasos.length - 1 ? setI((n) => n + 1) : setFase('fin')
                        }
                      >
                        {i < pasos.length - 1 ? 'Siguiente' : 'Terminar'}
                      </Button>
                      <button
                        onClick={cerrar}
                        className="shrink-0 px-1 text-xs text-fg-subtle underline underline-offset-4 hover:text-fg-muted"
                      >
                        Saltar
                      </button>
                    </div>
                  </>
                )}

                {fase === 'fin' && (
                  <>
                    <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                      ¿Deseas repetir el tutorial?
                    </h2>
                    <p className="mt-1.5 text-sm text-fg-muted">
                      Sin prisa. Es mejor repetirlo ahora que quedarte con la duda.
                    </p>

                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        bloque
                        variante="secundario"
                        onClick={() => {
                          setI(0)
                          setFase('pasos')
                        }}
                      >
                        Sí, repetir.
                      </Button>
                      {/* Cierra por hoy, pero se le vuelve a ofrecer la
                          próxima vez que entre: el único apagador es el de
                          abajo, y dice exactamente lo que hace. */}
                      <Button
                        bloque
                        onClick={() => {
                          guardar.mutate({ tutorial_visto_en: new Date().toISOString() })
                          cerrar()
                        }}
                      >
                        No, lo he entendido todo.
                      </Button>
                      <Button
                        bloque
                        variante="fantasma"
                        onClick={() => {
                          guardar.mutate({
                            mostrar_tutorial: false,
                            tutorial_visto_en: new Date().toISOString(),
                          })
                          cerrar()
                        }}
                      >
                        No volver a preguntar
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/*
                La guía es la calavera del estudio, la misma que cae en el
                login. Antes era un render 3D de banco de imágenes: un
                señor de traje señalando, el único elemento de toda la
                plataforma que no estaba dibujado a mano y que además no
                tenía nada que ver con un estudio de tatuajes.

                Flota y se ladea apenas. Los dos ritmos son primos entre sí
                (3.4 y 4.6 s) para que no vuelvan a coincidir cada pocos
                ciclos: si coincidieran, el movimiento se volvería un
                cabeceo regular y se leería como un GIF en bucle.
              */}
              <motion.div
                aria-hidden
                animate={{ y: [0, -5, 0], rotate: [-4, 4, -4] }}
                transition={{
                  y: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
                  rotate: { duration: 4.6, repeat: Infinity, ease: 'easeInOut' },
                }}
                /* `fg-subtle` y no `fg-muted`: en `muted` la calavera salía
                   más brillante que el título del propio globo y el ojo iba
                   a ella primero. Acompaña, no habla.

                   En la invitación desaparece en pantalla angosta: ahí el
                   globo ya ocupa casi todo el ancho y la calavera se salía
                   por la derecha encima del botón flotante. En el recorrido
                   sí se queda —el velo despeja todo lo de abajo— y ahí es
                   quien va contando los pasos. */
                className={cn(
                  'shrink-0 select-none text-fg-subtle',
                  !enRecorrido && 'hidden sm:block',
                )}
              >
                <CalaveraHablando tamano={64} className="sm:hidden" />
                <CalaveraHablando tamano={84} className="hidden sm:block" />
              </motion.div>
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body,
  )
}
