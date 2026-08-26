import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, History, Plus, Wrench } from 'lucide-react'
import { useTrabajos } from '../lib/queries/trabajos'
import { useRol } from '../hooks/useRol'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { Card, CardAnimada } from '../components/ui/Card'
import { Segmentado } from '../components/ui/Segmentado'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { FormTrabajo } from '../components/FormTrabajo'
import { BotonCSV } from '../components/BotonCSV'
import { COLUMNAS_KANBAN, ESTATUS_CERRADOS, TRABAJO_ESTATUS } from '../lib/etiquetas'
import {
  cuandoTexto,
  diasDesdeHoy,
  dinero,
  dividir,
  fechaCorta,
  hora12,
  minutosAHoras,
  plural,
} from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import { ENTRADA, transicion } from '../lib/animacion'
import { cn } from '../lib/cn'
import type { Trabajo } from '../lib/tipos'

type Vista = 'agenda' | 'tablero' | 'historial'
type Periodo = 'mes' | 'mes_pasado' | 'trimestre' | 'todo'

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'mes_pasado', texto: 'Mes pasado' },
  { valor: 'trimestre', texto: 'Últimos 3 meses' },
  { valor: 'todo', texto: 'Todo' },
]

/** Fecha que manda para ordenar: la sesión, y si no hay, el trazado. */
const fechaClave = (t: Trabajo) => t.fecha_tatuaje ?? t.fecha_trazado ?? null

const estaPagado = (t: Trabajo) => Number(t.saldo) <= 0 && Number(t.precio_total) > 0

function dentroDelPeriodo(iso: string | null, periodo: Periodo) {
  if (periodo === 'todo') return true
  if (!iso) return false
  const hoy = new Date()
  const f = new Date(iso.slice(0, 10))
  const mesesAtras =
    (hoy.getFullYear() - f.getFullYear()) * 12 + (hoy.getMonth() - f.getMonth())
  if (periodo === 'mes') return mesesAtras === 0
  if (periodo === 'mes_pasado') return mesesAtras === 1
  return mesesAtras >= 0 && mesesAtras < 3
}

export function Trabajos() {
  const { data: trabajos, isPending, error, refetch } = useTrabajos()
  const { puedeEscribir } = useRol()
  const navegar = useNavigate()
  const [vista, setVista] = useState<Vista>('agenda')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [altaAbierta, setAltaAbierta] = useState(false)

  const puede = puedeEscribir('trabajos')

  const activos = useMemo(
    () => (trabajos ?? []).filter((t) => !ESTATUS_CERRADOS.includes(t.estatus)),
    [trabajos],
  )

  const cerrados = useMemo(
    () => (trabajos ?? []).filter((t) => ESTATUS_CERRADOS.includes(t.estatus)),
    [trabajos],
  )

  const porCobrar = activos.reduce((s, t) => s + Number(t.saldo ?? 0), 0)

  /*
   * La agenda parte por urgencia, no por estatus. Un trabajo cuya fecha ya
   * pasó y sigue abierto es el único que de verdad exige una decisión hoy,
   * y en el tablero por columnas quedaba escondido entre los demás.
   */
  const grupos = useMemo(() => {
    const g: { titulo: string; nota?: string; trabajos: Trabajo[] }[] = [
      { titulo: 'Vencidos', nota: 'La fecha pasó y siguen abiertos', trabajos: [] },
      { titulo: 'Hoy', trabajos: [] },
      { titulo: 'Esta semana', trabajos: [] },
      { titulo: 'Más adelante', trabajos: [] },
      { titulo: 'Sin fecha', nota: 'Falta agendarlos', trabajos: [] },
    ]
    for (const t of activos) {
      const d = diasDesdeHoy(fechaClave(t))
      if (d == null) g[4].trabajos.push(t)
      else if (d < 0) g[0].trabajos.push(t)
      else if (d === 0) g[1].trabajos.push(t)
      else if (d <= 7) g[2].trabajos.push(t)
      else g[3].trabajos.push(t)
    }
    for (const x of g) {
      x.trabajos.sort((a, b) => (fechaClave(a) ?? '').localeCompare(fechaClave(b) ?? ''))
    }
    return g.filter((x) => x.trabajos.length > 0)
  }, [activos])

  const porColumna = useMemo(() => {
    const mapa = Object.fromEntries(COLUMNAS_KANBAN.map((c) => [c, [] as Trabajo[]]))
    for (const t of activos) mapa[t.estatus]?.push(t)
    return mapa
  }, [activos])

  const historial = useMemo(() => {
    return cerrados
      .filter((t) => dentroDelPeriodo(fechaClave(t) ?? t.updated_at?.slice(0, 10) ?? null, periodo))
      .sort((a, b) => (fechaClave(b) ?? '').localeCompare(fechaClave(a) ?? ''))
  }, [cerrados, periodo])

  const resumenHistorial = useMemo(() => {
    const terminados = historial.filter((t) => t.estatus === 'terminado')
    const cobrado = terminados.reduce(
      (s, t) => s + Number(t.anticipo) + Number(t.abonos ?? 0),
      0,
    )
    const minutos = terminados.reduce((s, t) => s + Number(t.minutos_totales ?? 0), 0)
    return {
      terminados: terminados.length,
      cancelados: historial.length - terminados.length,
      cobrado,
      tarifa: dividir(cobrado, minutos / 60),
      porCobrar: terminados.reduce((s, t) => s + Number(t.saldo ?? 0), 0),
    }
  }, [historial])

  const vencidos = grupos.find((g) => g.titulo === 'Vencidos')?.trabajos.length ?? 0

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Trabajos</h1>
          <p className="text-sm text-fg-muted">
            {plural(activos.length, 'activo', 'activos')} ·{' '}
            <span className="tabular">{dinero(porCobrar)}</span> por cobrar
            {vencidos > 0 && (
              <span className="text-danger"> · {plural(vencidos, 'vencido', 'vencidos')}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonCSV
            nombre="trabajos"
            filas={(trabajos ?? []).map((t) => ({
              id: t.id,
              cliente: t.cliente,
              whatsapp: t.whatsapp,
              diseno: t.diseno,
              catalogo_id: t.catalogo_id,
              nivel: t.nivel,
              zona: t.zona,
              fecha_trazado: t.fecha_trazado,
              fecha_tatuaje: t.fecha_tatuaje,
              hora: t.hora,
              precio_total: t.precio_total,
              anticipo: t.anticipo,
              abonos: t.abonos,
              saldo: t.saldo,
              pagado: estaPagado(t) ? 'Sí' : 'No',
              tiempo_diseno_min: t.tiempo_diseno_min,
              tiempo_aplicacion_min: t.tiempo_aplicacion_min,
              minutos_totales: t.minutos_totales,
              estatus: TRABAJO_ESTATUS[t.estatus].texto,
              origen: t.origen,
              retoque_pendiente: t.retoque_pendiente ? 'Sí' : 'No',
            }))}
          />
          {puede && (
            <Button
              data-tour="nuevo-trabajo"
              onClick={() => setAltaAbierta(true)}
              className="hidden md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          )}
        </div>
      </header>

      <div data-tour="vistas-trabajos">
        <Segmentado
          idGrupo="trabajos"
          valor={vista}
          onCambio={setVista}
          opciones={[
            { valor: 'agenda', etiqueta: 'Agenda', conteo: activos.length },
            { valor: 'tablero', etiqueta: 'Tablero' },
            { valor: 'historial', etiqueta: 'Historial', conteo: cerrados.length },
          ]}
        />
      </div>

      {/*
        Aquí hubo un cruce al cambiar de vista, y se quitó.
        Metía un AnimatePresence más entre AppShell y el contenido, o sea
        otro ancestro animándose por encima de las tarjetas justo cuando
        framer mide para posicionarlas. Trabajos entraba en blanco en el
        teléfono y solo aparecía al forzar un re-render. La transición entre
        Agenda, Tablero e Historial no vale que la pantalla no se vea; las
        tarjetas ya entran con su propia animación, que no mide nada.
      */}
      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <SkeletonLista />
      ) : vista === 'historial' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                className={cn(
                  'pulsable rounded-xl px-3.5 py-2 text-sm font-medium',
                  periodo === p.valor
                    ? 'bg-primary/20 text-primary shadow-arcilla-sutil'
                    : 'pozo text-fg-muted hover:text-fg',
                )}
              >
                {p.texto}
              </button>
            ))}
          </div>

          {historial.length === 0 ? (
            <Vacio
              icono={<History className="h-6 w-6" />}
              titulo="Nada cerrado en este periodo"
              descripcion="Aquí se guardan los terminados y cancelados para que no estorben en el tablero."
            />
          ) : (
            <>
              <Card className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Resumen titulo="Terminados" valor={String(resumenHistorial.terminados)} />
                <Resumen titulo="Cobrado" valor={dinero(resumenHistorial.cobrado)} />
                <Resumen
                  titulo="Tarifa real"
                  valor={
                    resumenHistorial.tarifa == null
                      ? '—'
                      : `${dinero(resumenHistorial.tarifa)}/h`
                  }
                />
                <Resumen
                  titulo="Por cobrar"
                  valor={dinero(resumenHistorial.porCobrar)}
                  tono={resumenHistorial.porCobrar > 0 ? 'text-warn' : undefined}
                />
              </Card>

              <div className="grid gap-2.5 lg:grid-cols-2">
                <AnimatePresence initial={false}>
                  {historial.map((t, i) => (
                    <TarjetaTrabajo
                      key={t.id}
                      trabajo={t}
                      indice={i}
                      onAbrir={() => navegar(`/trabajos/${t.id}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      ) : activos.length === 0 ? (
        <Vacio
          icono={<Wrench className="h-6 w-6" />}
          titulo="Sin trabajos activos"
          descripcion="Los leads que quedan agendados aparecen aquí solos, con su precio y su cita."
          accion={puede ? <Button onClick={() => setAltaAbierta(true)}>Crear uno a mano</Button> : undefined}
        />
      ) : vista === 'agenda' ? (
        <div className="space-y-5">
          {/* Los grupos aparecen y desaparecen solos según la fecha: al
              terminar el último trabajo vencido, esa sección entera se va.

              SIN `layout` a propósito. Una animación de layout obliga a
              framer a medir la posición real del elemento y aplicarle un
              transform para interpolarla. Aquí eso ocurría mientras el
              motion.div de AppShell todavía estaba animando su propio `y`:
              la medición salía contra un ancestro en movimiento y el
              transform resultante mandaba las secciones fuera de la
              pantalla. Quedaba en blanco hasta que algo forzaba un
              re-render —cambiar el tema, por ejemplo— y framer volvía a
              medir con todo ya quieto. Reacomodar los grupos con suavidad
              no vale que la pantalla no se vea. */}
          <AnimatePresence initial={false}>
            {grupos.map((g) => (
              <motion.section
                key={g.titulo}
                variants={ENTRADA}
                initial="oculto"
                animate="visible"
                exit="saliendo"
                transition={transicion()}
              >
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                    {g.titulo} · {g.trabajos.length}
                  </h2>
                  {g.nota && <span className="text-xs text-fg-subtle">{g.nota}</span>}
                </div>
                {/* Dos columnas desde lg, como la rejilla que ya usa Catálogo.
                    En una sola, a 1000 px de ancho, el nombre quedaba en el
                    extremo izquierdo y su precio en el derecho con medio
                    metro de vacío en medio: para saber cuánto debe Jair
                    había que cruzar la tarjeta entera con la vista. Partida
                    en dos, el recorrido del ojo se corta a la mitad y caben
                    el doble de trabajos sin desplazar. */}
                <div className="grid gap-2.5 lg:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {g.trabajos.map((t, i) => (
                      <TarjetaTrabajo
                        key={t.id}
                        trabajo={t}
                        indice={i}
                        urgente={g.titulo === 'Vencidos'}
                        onAbrir={() => navegar(`/trabajos/${t.id}`)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {COLUMNAS_KANBAN.map((col) => (
            <section key={col} className="w-[78vw] shrink-0 md:w-auto">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                  {TRABAJO_ESTATUS[col].texto}
                </h2>
                <span className="tabular text-2xs text-fg-subtle">{porColumna[col].length}</span>
              </div>

              <div className="space-y-2.5 rounded-2xl bg-surface-2/40 p-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {porColumna[col].map((t, i) => (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(i, 6) * 0.025,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      onClick={() => navegar(`/trabajos/${t.id}`)}
                      className="group cursor-pointer rounded-xl arcilla p-3 pulsable"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-base font-medium text-fg">{t.cliente}</p>
                        <span className="font-mono shrink-0 text-2xs text-fg-subtle">{t.id}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-fg-muted">{t.diseno}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-subtle">
                        <span className="tabular">{dinero(t.precio_total)}</span>
                        {Number(t.saldo) > 0 ? (
                          <span className="tabular text-warn">Debe {dinero(Number(t.saldo))}</span>
                        ) : (
                          <span className="text-success">Pagado</span>
                        )}
                        {fechaClave(t) && <span>{cuandoTexto(fechaClave(t))}</span>}
                      </div>

                      {/* Mismo aviso que en la agenda: estas tarjetas también
                          abren el expediente y tampoco lo decían. */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 pt-2">
                        <span className="text-2xs font-medium text-primary">Ver expediente</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {porColumna[col].length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-fg-subtle">Vacío</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {puede && (
        <BotonFlotante
          data-tour="nuevo-trabajo"
          onClick={() => setAltaAbierta(true)}
          aria-label="Nuevo trabajo"
        >
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      <Sheet
        abierto={altaAbierta}
        onCerrar={() => setAltaAbierta(false)}
        titulo="Nuevo trabajo"
        descripcion="Para lo que no pasó por Leads. El folio se asigna solo."
      >
        <FormTrabajo alGuardar={() => setAltaAbierta(false)} />
      </Sheet>
    </div>
  )
}

function TarjetaTrabajo({
  trabajo: t,
  indice,
  urgente,
  onAbrir,
}: {
  trabajo: Trabajo
  indice: number
  urgente?: boolean
  onAbrir: () => void
}) {
  const tarifa = dividir(Number(t.precio_total), Number(t.minutos_totales) / 60)
  const fecha = fechaClave(t)
  const pagado = estaPagado(t)
  const esTatuaje = Boolean(t.fecha_tatuaje)

  return (
    <CardAnimada
      indice={indice}
      onClick={onAbrir}
      /*
        Urgente ya no se dice con un borde rojo —no hay bordes— sino
        tiñendo la masa, igual que los avisos del Tablero. El tinte va con
        `color-mix` sobre la superficie y no con una alfa, porque una alfa
        se mezclaría con el fondo casi negro de la página y el rojo se
        perdería.
      */
      className={cn(
        'group',
        urgente && 'bg-[color-mix(in_srgb,rgb(var(--danger))_14%,rgb(var(--surface)))]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-base font-medium text-fg">{t.cliente}</p>
            <span className="font-mono shrink-0 text-2xs text-fg-subtle">{t.id}</span>
          </div>
          <p className="mt-0.5 truncate text-sm text-fg-muted">{t.diseno}</p>

          {fecha && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
              <span className={cn('font-medium', urgente ? 'text-danger' : 'text-fg')}>
                {cuandoTexto(fecha)}
              </span>
              <span className="text-fg-subtle">
                {esTatuaje ? '' : 'Trazado · '}
                {fechaCorta(fecha)}
                {esTatuaje && t.hora ? ` · ${hora12(t.hora)}` : ''}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
            <span>Nivel {t.nivel}</span>
            <span>{t.zona}</span>
            {Number(t.minutos_totales) > 0 && <span>{minutosAHoras(t.minutos_totales)}</span>}
            {tarifa != null && <span className="tabular">{dinero(tarifa)}/h</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tono={TRABAJO_ESTATUS[t.estatus].tono}>{TRABAJO_ESTATUS[t.estatus].texto}</Badge>
          <span className="tabular text-sm text-fg">{dinero(t.precio_total)}</span>
          {pagado ? (
            <Badge tono="exito" punto>
              Pagado
            </Badge>
          ) : (
            <span className="tabular text-xs text-warn">Debe {dinero(Number(t.saldo))}</span>
          )}
          {t.retoque_pendiente && <Badge tono="acento">Retoque</Badge>}
        </div>
      </div>

      {/*
        La tarjeta entera abre el expediente, pero eso no se ve por ningún
        lado: en el teléfono no hay cursor que cambie de forma al pasar
        encima, así que quien no lo supiera de antemano no lo descubría.
        Este pie lo dice con todas sus letras y además lo señala — la
        flecha es la misma que ya usa Leads para "Ver su trabajo", así el
        gesto se aprende una vez y sirve en las dos pantallas.
      */}
      {/* Un <button> de verdad, no un <span>. Ver la nota de la tarjeta de
          Leads: la tarjeta entera abre el expediente al tocarla, pero eso
          solo sirve con dedo o ratón. Este pie es el control alcanzable
          con Tab, y `stopPropagation` evita abrirlo dos veces. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onAbrir()
        }}
        className="-mx-1 mt-3 flex w-[calc(100%+0.5rem)] items-center justify-between gap-2 rounded-lg px-1 pt-2.5 text-left"
      >
        <span className="text-xs font-medium text-primary">Ver expediente completo</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    </CardAnimada>
  )
}

function Resumen({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">{titulo}</p>
      <p className={cn('tabular font-display mt-1 text-xl font-semibold text-fg', tono)}>{valor}</p>
    </div>
  )
}
