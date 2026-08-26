import { Suspense, useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  Hammer,
  Images,
  LayoutDashboard,
  LogOut,
  Megaphone,
  HelpCircle,
  MoreHorizontal,
  Moon,
  Settings,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRol, NOMBRE_ROL } from '../../hooks/useRol'
import { useTema } from '../../hooks/useTema'
import { useConexion } from '../../hooks/useConexion'
import { Sheet } from '../ui/Sheet'
import { Tutorial } from '../Tutorial'
import { EditarPerfil } from '../EditarPerfil'
import { IconoContenido } from '../IconoContenido'
import { SkeletonLista } from '../ui/Estados'
import { RESORTE_VIAJE } from '../../lib/animacion'
import { cn } from '../../lib/cn'
import { precargaAl, precargarRuta } from '../../lib/precarga'
import type { Perfil } from '../../lib/tipos'

/**
 * Lo único que el menú le pide a un icono. Se describe por lo que recibe y no
 * como `typeof LayoutDashboard` para que quepan tanto los de lucide como los
 * propios — Contenido usa uno que rota entre TikTok, Instagram y Facebook.
 */
type Icono = ComponentType<{ className?: string; strokeWidth?: number }>

interface Entrada {
  ruta: string
  etiqueta: string
  icono: Icono
  /**
   * Clase del gesto del icono, definida en index.css. Cada una imita lo
   * que hace la sección: el martillo martilla, el engrane gira.
   *
   * Antes esto era una animación en BUCLE INFINITO y ahora corre UNA VEZ,
   * disparada por dos cosas: entrar a la sección, o pasarle el cursor por
   * encima donde haya cursor. El porqué está entero en index.css, en el
   * bloque "GESTOS DE LOS ICONOS" — resumido: un menú se ve cientos de
   * veces al día, y a esa frecuencia una animación deja de informar y
   * pasa a ser ruido que compite contra los datos.
   *
   * Contenido no lleva ninguna: su icono ya se mueve solo, turnándose
   * entre TikTok, Instagram y Facebook.
   */
  gesto?: string
  soloAdmin?: boolean
}

/** Todo el menú, en orden. El sidebar de desktop los muestra todos. */
const ENTRADAS: Entrada[] = [
  { ruta: '/', etiqueta: 'Tablero', icono: LayoutDashboard, gesto: 'gesto-latir' },
  { ruta: '/leads', etiqueta: 'Leads', icono: Users, gesto: 'gesto-asomarse' },
  { ruta: '/trabajos', etiqueta: 'Trabajos', icono: Hammer, gesto: 'gesto-martillar' },
  { ruta: '/contenido', etiqueta: 'Contenido', icono: IconoContenido },
  { ruta: '/ads', etiqueta: 'Pauta', icono: Megaphone, gesto: 'gesto-vocear' },
  { ruta: '/catalogo', etiqueta: 'Catálogo', icono: Images, gesto: 'gesto-hojear' },
  {
    ruta: '/config',
    etiqueta: 'Ajustes',
    icono: Settings,
    gesto: 'gesto-engranar',
    soloAdmin: true,
  },
]

/**
 * En móvil solo caben 4 destinos + "Más": apretar 7 iconos en 375px rompe
 * el mínimo de 44px de área táctil. Los 4 fijos son los de captura diaria;
 * el resto vive en el sheet de "Más".
 */
const EN_BARRA = ['/', '/leads', '/trabajos', '/contenido']

export function AppShell() {
  const { perfil, salir } = useAuth()
  const { rol, esAdmin } = useRol()
  const { tema, alternar } = useTema()
  const enLinea = useConexion()
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [masAbierto, setMasAbierto] = useState(false)
  const [tutorialSolicitado, setTutorialSolicitado] = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(false)

  function verTutorial() {
    setMasAbierto(false)
    setTutorialSolicitado(true)
  }

  const entradas = ENTRADAS.filter((e) => !e.soloAdmin || esAdmin)
  const barra = entradas.filter((e) => EN_BARRA.includes(e.ruta))
  const enMas = entradas.filter((e) => !EN_BARRA.includes(e.ruta))
  const masActivo = enMas.some((e) => e.ruta === ubicacion.pathname)

  return (
    <div className="min-h-dvh bg-bg">
      {/* ── Sidebar en desktop ──────────────────────────────────────── */}
      {/*
        La barra lateral es una PARED, no una tarjeta: va pegada al borde
        de la ventana por tres lados, así que no puede tener sombra
        proyectada en esos tres. Lleva solo la del canto derecho, que es
        el único que da al contenido, y el filo de luz de arriba.
      */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-surface shadow-[8px_0_28px_-16px_rgb(0_0_0/0.55)] md:flex">
        <div className="px-5 pb-5 pt-7">
          <p className="font-display text-xl font-semibold tracking-tight text-fg">Estudio</p>
          <p className="mt-0.5 text-sm text-fg-subtle">Tablero de instrumentos</p>
        </div>

        <nav data-tour="nav" className="flex-1 space-y-0.5 px-3">
          {entradas.map((e) => (
            <NavLink key={e.ruta} to={e.ruta} end={e.ruta === '/'} {...precargaAl(e.ruta)}>
              {({ isActive }) => (
                <span
                  /*
                   * `fila-nav` y `data-activo` son los dos disparadores del
                   * gesto del icono: uno para el cursor, otro para la
                   * sección activa. Los engancha el CSS, no JavaScript.
                   *
                   * `data-activo` solo aparece cuando la ruta está activa,
                   * y ese cambio de atributo basta para que la animación
                   * corra una vez. No hace falta remontar el nodo.
                   */
                  className={cn(
                    'fila-nav relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base',
                    'transition-colors duration-150 ease-salida',
                    isActive ? 'text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                  )}
                  {...(isActive ? { 'data-activo': '' } : {})}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-activo"
                      transition={RESORTE_VIAJE}
                      /*
                       * La pastilla del menú es la MISMA pieza para las
                       * siete secciones: por eso viaja en vez de encenderse
                       * y apagarse. Es barro de verdad, con su sombra, no
                       * un resaltado translúcido.
                       */
                      className="absolute inset-0 rounded-xl bg-primary/16 shadow-arcilla-sutil"
                    />
                  )}
                  <e.icono
                    className={cn(
                      'relative h-[18px] w-[18px] shrink-0',
                      e.gesto && `gesto ${e.gesto}`,
                      isActive && 'text-primary',
                    )}
                  />
                  <span className="relative">{e.etiqueta}</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Separado por una sombra hacia arriba, no por un borde: en un
            sistema con volumen la línea de 1px es lo único que se lee
            como dibujo en vez de como material. */}
        <div className="p-3 shadow-[0_-8px_16px_-14px_rgb(0_0_0/0.6)]">
          {/* Era un bloque muerto: mostraba quién eres y no llevaba a nada.
              Ahora es la puerta a editar el perfil, que es lo que uno espera
              al tocar su propia foto. */}
          <button
            onClick={() => setEditandoPerfil(true)}
            className="pulsable group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 hover:shadow-arcilla-sutil"
          >
            <Avatar perfil={perfil} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{perfil?.nombre ?? '—'}</p>
              <p className="text-xs text-fg-subtle">
                <span className="group-hover:hidden">{rol ? NOMBRE_ROL[rol] : ''}</span>
                <span className="hidden text-primary group-hover:inline">Editar perfil</span>
              </p>
            </div>
          </button>
          <button
            onClick={verTutorial}
            className="pulsable mt-1 flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg hover:shadow-arcilla-sutil"
          >
            <HelpCircle className="h-4 w-4" />
            Ver tutorial
          </button>

          <div className="mt-1 flex gap-1">
            <button
              onClick={alternar}
              className="pulsable flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm text-fg-muted hover:bg-surface-2 hover:text-fg hover:shadow-arcilla-sutil"
            >
              {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {tema === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
            <button
              onClick={() => void salir()}
              className="pulsable flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm text-fg-muted hover:bg-surface-2 hover:text-fg hover:shadow-arcilla-sutil"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* ── Barra superior en móvil ─────────────────────────────────── */}
      {/* Opaca y sin desenfoque. Ver la nota larga de <main>: esta barra y la
          navegación de abajo eran las dos capas de `backdrop-filter` que
          dejaban el contenido sin repintar en el teléfono. El desenfoque solo
          se nota sobre un fondo translúcido, así que quitarlo y dejar el color
          sólido es el mismo cambio dicho dos veces. */}
      <header className="safe-top sticky top-0 z-20 bg-bg md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold tracking-tight text-fg">Estudio</span>
            {rol && (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.06em] text-fg-subtle shadow-arcilla-sutil">
                {NOMBRE_ROL[rol]}
              </span>
            )}
          </div>
          <button
            onClick={alternar}
            aria-label="Cambiar tema"
            className="pulsable -mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted"
          >
            {tema === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ── Aviso de sin conexión ───────────────────────────────────── */}
      <AnimatePresence>
        {!enLinea && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-20 overflow-hidden md:top-0 md:ml-64"
          >
            <div className="flex items-center gap-2 bg-warn/15 px-4 py-2.5 text-sm font-medium text-warn shadow-[inset_0_-6px_10px_-8px_rgb(0_0_0/0.5)]">
              <WifiOff className="h-4 w-4 shrink-0" />
              Sin conexión — puedes ver lo último cargado, pero no guardar.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contenido ───────────────────────────────────────────────── */}
      <main className="md:ml-64">
        {/*
          Sin transición de página, y esta vez hasta el final.

          Era un problema de PINTADO, no de lógica: el contenido siempre
          estuvo ahí, con su tamaño y recibiendo los toques, pero el teléfono
          no llegaba a dibujarlo. Por eso cualquier cosa que forzara un
          repintado —cambiar de tema, abrir "Más", o rozar un botón y
          disparar su `hover`— lo hacía aparecer de golpe y completo.

          Se juntaban dos cosas, y las dos solo existen en móvil. Esta caja
          quedaba entre las dos barras con `backdrop-filter` (arriba sticky,
          abajo fija, ambas md:hidden), que obligan al navegador a componer
          todo lo que tienen debajo; y encima se animaba su opacidad en cada
          cambio de ruta, lo que la promueve a capa de composición propia.
          Entre las dos, la capa se quedaba con los píxeles viejos.

          Se notaba solo donde nada se anima al montar. Una lista con
          tarjetas se salva sola: sus entradas escalonadas repintan durante
          200 ms y de paso arrastran la capa. Trabajos sin trabajos activos
          pinta una vez y ya, y ese único pintado era el que se perdía. En
          escritorio no pasa porque ahí esas barras ni se renderizan.

          Ya no hay desenfoque en las barras, así que el conflicto está roto
          por los dos lados. El fundido tampoco vuelve: cambiar de sección
          queda instantáneo, que en el teléfono se siente mejor que 180 ms de
          espera, y ninguna pantalla depende de que algo se anime para verse.
        */}
        {/*
          UNA sola frontera de Suspense para todas las rutas, aquí y no una
          por ruta.

          Con una por ruta, ir de Leads a Pauta montaba una frontera NUEVA,
          y ante una frontera nueva React no tiene nada viejo que conservar:
          tira la pantalla anterior en el acto y enseña el respaldo. Medido,
          el área de contenido quedaba vacía 245 ms — sin título y sin
          esqueleto. Un hueco en blanco es peor que un esqueleto.

          Compartiendo frontera, la de Leads ya está montada cuando empieza
          la navegación, así que React deja Leads en pantalla mientras
          resuelve Pauta y cambia de una vez cuando está lista. Nada
          parpadea porque nada se va antes de tiempo.

          El respaldo solo se ve cuando de verdad no hay nada que conservar:
          entrar por URL directa o recargar sobre una ruta perezosa.
        */}
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          <Suspense fallback={<SkeletonLista />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* ── Navegación inferior en móvil ────────────────────────────── */}
      <nav
        data-tour="nav"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 bg-surface shadow-[0_-10px_28px_-14px_rgb(0_0_0/0.6)] md:hidden"
      >
        <div className="flex">
          {barra.map((e) => (
            <NavLink
              key={e.ruta}
              to={e.ruta}
              end={e.ruta === '/'}
              className="flex-1"
              {...precargaAl(e.ruta)}
            >
              {({ isActive }) => (
                <span
                  className={cn(
                    'fila-nav relative flex h-16 flex-col items-center justify-center gap-1',
                    'transition-colors duration-150 ease-salida',
                    isActive ? 'text-primary' : 'text-fg-subtle',
                  )}
                  {...(isActive ? { 'data-activo': '' } : {})}
                >
                  {/* La misma pastilla viajera que en el escritorio, aquí
                      detrás del icono. Es lo que hace que cambiar de
                      sección se sienta como mover una pieza y no como
                      encender otra luz. */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-activo-movil"
                      transition={RESORTE_VIAJE}
                      className="absolute inset-x-3 inset-y-2 rounded-2xl bg-primary/14 shadow-arcilla-sutil"
                    />
                  )}
                  <e.icono
                    className={cn('relative h-[22px] w-[22px]', e.gesto && ('gesto ' + e.gesto))}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="relative text-2xs font-medium">{e.etiqueta}</span>
                </span>
              )}
            </NavLink>
          ))}

          {/* Abrir "Más" ya es intención de ir a alguna de las que hay
              dentro, y son justo las que no caben en la barra. Se piden las
              suyas mientras la hoja sube: para cuando el dedo elige, el
              archivo llegó. */}
          <button
            onClick={() => {
              enMas.forEach((e) => precargarRuta(e.ruta))
              setMasAbierto(true)
            }}
            className="flex-1"
          >
            <span
              className={cn(
                'relative flex h-16 flex-col items-center justify-center gap-1',
                'transition-colors duration-150 ease-salida',
                masActivo ? 'text-primary' : 'text-fg-subtle',
              )}
            >
              {masActivo && (
                <motion.span
                  layoutId="nav-activo-movil"
                  transition={RESORTE_VIAJE}
                  className="absolute inset-x-3 inset-y-2 rounded-2xl bg-primary/14 shadow-arcilla-sutil"
                />
              )}
              <MoreHorizontal className="relative h-[22px] w-[22px]" strokeWidth={masActivo ? 2.4 : 1.8} />
              <span className="relative text-2xs font-medium">Más</span>
            </span>
          </button>
        </div>
      </nav>

      <Sheet abierto={masAbierto} onCerrar={() => setMasAbierto(false)} titulo="Más">
        <div className="space-y-1">
          {enMas.map((e) => (
            <button
              key={e.ruta}
              {...precargaAl(e.ruta)}
              onClick={() => {
                setMasAbierto(false)
                navegar(e.ruta)
              }}
              className="pulsable fila-nav flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base text-fg hover:bg-surface-2"
            >
              <e.icono className={cn('h-5 w-5 text-fg-muted', e.gesto && ('gesto ' + e.gesto))} />
              {e.etiqueta}
            </button>
          ))}

          <button
            onClick={verTutorial}
            className="pulsable fila-nav flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base text-fg hover:bg-surface-2"
          >
            <HelpCircle className="h-5 w-5 text-fg-muted" />
            Ver tutorial
          </button>

          <div className="!mt-4 pt-3 shadow-[0_-8px_16px_-14px_rgb(0_0_0/0.6)]">
            <button
              onClick={() => {
                setMasAbierto(false)
                setEditandoPerfil(true)
              }}
              className="pulsable flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2"
            >
              <Avatar perfil={perfil} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-fg">{perfil?.nombre ?? '—'}</p>
                <p className="text-sm text-fg-subtle">
                  {rol ? NOMBRE_ROL[rol] : ''} · <span className="text-primary">Editar perfil</span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
            </button>
            <button
              onClick={() => void salir()}
              className="pulsable flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base text-danger hover:bg-danger/10"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </Sheet>

      <EditarPerfil abierto={editandoPerfil} onCerrar={() => setEditandoPerfil(false)} />

      <Tutorial
        solicitado={tutorialSolicitado}
        onCerrarSolicitado={() => setTutorialSolicitado(false)}
      />
    </div>
  )
}

/**
 * La foto del perfil, o la inicial del nombre si todavía no hay ninguna.
 *
 * La inicial no es un relleno provisional: con tres personas es lo que
 * distingue una cuenta de otra de un vistazo, y funciona desde el primer
 * día sin pedirle a nadie que suba nada.
 */
function Avatar({ perfil }: { perfil: Perfil | null }) {
  if (perfil?.avatar_url) {
    return (
      <img
        src={perfil.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover shadow-arcilla-sutil"
      />
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary shadow-arcilla-sutil">
      {(perfil?.nombre ?? '?').slice(0, 1).toUpperCase()}
    </div>
  )
}
