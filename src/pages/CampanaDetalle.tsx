import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useCampana,
  useCreativos,
  useRegistrosDeCampana,
  useGuardarCreativo,
  useEliminarCreativo,
  useGuardarRegistro,
  useEliminarRegistro,
  useEliminarCampana,
} from '../lib/queries/ads'
import { useUmbrales } from '../lib/queries/config'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input, InputNumero, Select, Switch } from '../components/ui/Campo'
import { SelectorFecha } from '../components/ui/SelectorFecha'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { Card, CardAnimada } from '../components/ui/Card'
import { Skeleton, ErrorCarga, Vacio } from '../components/ui/Estados'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { GraficaCostoConversacion } from '../components/GraficaCostoConversacion'
import { ExplicacionCostoConv } from '../components/ExplicacionCostoConv'
import { PLATAFORMA_ADS, VEREDICTO } from '../lib/etiquetas'
import {
  dinero,
  dineroExacto,
  fechaCorta,
  hoyISO,
  numero,
  plural,
  porcentaje,
} from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import { DURACION, escalonar, transicion } from '../lib/animacion'
import { cn } from '../lib/cn'
import type { AdConVeredicto, CreativoConMetricas } from '../lib/tipos'

const aNumero = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function CampanaDetalle() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { data: campana, isPending, error, refetch } = useCampana(id)
  const { data: creativos } = useCreativos(id)
  const { data: registros } = useRegistrosDeCampana(id)
  const { umbrales } = useUmbrales()
  const { puedeEscribir } = useRol()
  const toast = useToast()

  const guardarCreativo = useGuardarCreativo()
  const borrarCreativo = useEliminarCreativo()
  const guardarRegistro = useGuardarRegistro()
  const borrarRegistro = useEliminarRegistro()
  const borrarCampana = useEliminarCampana()

  const [formCreativo, setFormCreativo] = useState<CreativoConMetricas | 'nuevo' | null>(null)
  const [nombreCr, setNombreCr] = useState('')
  const [presupuestoCr, setPresupuestoCr] = useState('')
  const [activoCr, setActivoCr] = useState(true)

  const [formDia, setFormDia] = useState<AdConVeredicto | 'nuevo' | null>(null)
  const [creativoDia, setCreativoDia] = useState('')
  const [fechaDia, setFechaDia] = useState(hoyISO())
  const [gastoDia, setGastoDia] = useState('')
  const [convsDia, setConvsDia] = useState('')

  const [aBorrarCreativo, setABorrarCreativo] = useState<CreativoConMetricas | null>(null)
  const [aBorrarDia, setABorrarDia] = useState<AdConVeredicto | null>(null)
  const [borrarTodo, setBorrarTodo] = useState(false)

  const puede = puedeEscribir('ads')

  /** Una línea por creativo: es la comparación que decide a cuál escalar. */
  const { datos, nombres } = useMemo(() => {
    const filas = registros ?? []
    const nombres = [...new Set(filas.map((a) => a.creativo))].slice(0, 4)
    const fechas = [...new Set(filas.map((a) => a.fecha))].sort()
    const datos = fechas.map((f) => {
      const punto: Record<string, string | number | null> = { fecha: fechaCorta(f) }
      for (const n of nombres) {
        const fila = filas.find((a) => a.fecha === f && a.creativo === n)
        // null y no 0 cuando no hubo conversaciones: la línea se corta en
        // vez de caer al piso fingiendo que costó $0.
        punto[n] = fila?.costo_por_conversacion != null ? Number(fila.costo_por_conversacion) : null
      }
      return punto
    })
    return { datos, nombres }
  }, [registros])

  function abrirCreativo(c: CreativoConMetricas | 'nuevo') {
    setFormCreativo(c)
    setNombreCr(c === 'nuevo' ? '' : c.nombre)
    setPresupuestoCr(c === 'nuevo' ? '' : String(Number(c.presupuesto)))
    setActivoCr(c === 'nuevo' ? true : c.activo)
  }

  function abrirDia(a: AdConVeredicto | 'nuevo') {
    setFormDia(a)
    if (a === 'nuevo') {
      setCreativoDia((creativos ?? [])[0]?.id ?? '')
      setFechaDia(hoyISO())
      setGastoDia('')
      setConvsDia('')
    } else {
      setCreativoDia(a.creativo_id)
      setFechaDia(a.fecha)
      setGastoDia(String(Number(a.gasto_real)))
      setConvsDia(String(a.conversaciones))
    }
  }

  async function salvarCreativo() {
    if (!id) return
    if (!nombreCr.trim()) {
      toast.error('Ponle nombre al creativo.')
      return
    }
    try {
      await guardarCreativo.mutateAsync({
        id: formCreativo !== 'nuevo' && formCreativo ? formCreativo.id : undefined,
        datos: {
          campana_id: id,
          nombre: nombreCr.trim(),
          presupuesto: aNumero(presupuestoCr),
          activo: activoCr,
        },
      })
      toast.exito(formCreativo === 'nuevo' ? 'Creativo agregado' : 'Creativo actualizado')
      setFormCreativo(null)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    }
  }

  async function salvarDia() {
    if (!creativoDia) {
      toast.error('Elige a qué creativo pertenece el gasto.')
      return
    }
    if (!fechaDia) {
      toast.error('Falta la fecha.')
      return
    }
    try {
      await guardarRegistro.mutateAsync({
        id: formDia !== 'nuevo' && formDia ? formDia.id : undefined,
        datos: {
          creativo_id: creativoDia,
          fecha: fechaDia,
          gasto_real: aNumero(gastoDia),
          conversaciones: Math.round(aNumero(convsDia)),
        },
      })
      toast.exito('Día registrado')
      setFormDia(null)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    }
  }

  if (error) {
    return <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
  }

  if (isPending || !campana) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const v = VEREDICTO[campana.veredicto]
  const usado =
    Number(campana.presupuesto_total) > 0
      ? Number(campana.gasto_real) / Number(campana.presupuesto_total)
      : null
  const sinRepartir = Number(campana.presupuesto_total) - Number(campana.presupuesto_asignado)

  return (
    <div className="space-y-4">
      <button
        onClick={() => navegar('/ads')}
        className="-ml-2 flex h-11 items-center gap-1.5 px-2 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Pauta
      </button>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{campana.nombre}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-fg-muted">
            <span>{PLATAFORMA_ADS[campana.plataforma]}</span>
            <span>{campana.objetivo}</span>
            <span>
              {fechaCorta(campana.fecha_inicio)}
              {campana.fecha_fin ? ` → ${fechaCorta(campana.fecha_fin)}` : ''}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tono={v.tono} punto>
              {v.texto}
            </Badge>
            {!campana.activa && <Badge tono="neutro">Pausada</Badge>}
          </div>
        </div>
        {puede && (
          <Button variante="peligro" onClick={() => setBorrarTodo(true)} aria-label="Eliminar campaña">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </header>

      {/* ── Presupuesto y resultado ──────────────────────────────────── */}
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra titulo="Presupuesto" valor={dinero(campana.presupuesto_total)} />
          <Cifra titulo="Gastado" valor={dinero(campana.gasto_real)} />
          <Cifra titulo="Conversaciones" valor={numero(campana.conversaciones)} />
          <Cifra
            titulo="Costo/conv."
            valor={
              campana.costo_por_conversacion == null
                ? '—'
                : dineroExacto(Number(campana.costo_por_conversacion))
            }
            tono={
              campana.veredicto === 'matar'
                ? 'text-danger'
                : campana.veredicto === 'escalar'
                  ? 'text-success'
                  : undefined
            }
          />
        </div>

        {Number(campana.presupuesto_total) > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-fg-muted">Consumido</span>
              <span className="tabular text-fg-subtle">{porcentaje(usado)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((usado ?? 0) * 100, 100)}%` }}
                transition={transicion(DURACION.lenta)}
                className={cn(
                  'h-full rounded-full',
                  usado != null && usado > 1 ? 'bg-danger' : 'bg-primary',
                )}
              />
            </div>
            <p className="mt-1.5 text-sm text-fg-subtle">
              {sinRepartir > 0
                ? `${dinero(sinRepartir)} del presupuesto todavía sin asignar a ningún creativo.`
                : sinRepartir < 0
                  ? `Los creativos suman ${dinero(-sinRepartir)} más de lo autorizado para la campaña.`
                  : 'Todo el presupuesto está repartido entre los creativos.'}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-fg-muted">{v.accion}</p>
          {/* Aquí es donde de verdad se mira el número, así que la
              explicación también vive aquí y no solo en la lista. */}
          <ExplicacionCostoConv />
        </div>
      </Card>

      {/* ── Desglose por creativo ────────────────────────────────────── */}
      <section>
        <div className="mb-2.5 flex items-end justify-between gap-3">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Creativos · {(creativos ?? []).length}
          </h2>
          {puede && (
            <Button tamano="sm" variante="secundario" onClick={() => abrirCreativo('nuevo')}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          )}
        </div>

        {(creativos ?? []).length === 0 ? (
          <Vacio
            icono={<Layers className="h-6 w-6" />}
            titulo="Sin creativos"
            descripcion="Cada creativo lleva su propio presupuesto. El gasto diario se captura contra uno de ellos."
            accion={puede ? <Button onClick={() => abrirCreativo('nuevo')}>Agregar el primero</Button> : undefined}
          />
        ) : (
          <div className="space-y-2.5">
            {(creativos ?? []).map((c, i) => {
              const vc = VEREDICTO[c.veredicto]
              const consumo =
                Number(c.presupuesto) > 0 ? Number(c.gasto_real) / Number(c.presupuesto) : null
              return (
                <CardAnimada key={c.id} indice={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-medium text-fg">{c.nombre}</p>
                        {!c.activo && <Badge tono="neutro">Apagado</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        {c.dias_capturados} {c.dias_capturados === 1 ? 'día' : 'días'} capturados
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tono={vc.tono} punto>
                        {vc.texto}
                      </Badge>
                      {puede && (
                        <>
                          <button
                            onClick={() => abrirCreativo(c)}
                            aria-label={`Editar ${c.nombre}`}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setABorrarCreativo(c)}
                            aria-label={`Eliminar ${c.nombre}`}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-fg-subtle transition-colors hover:bg-danger/12 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Mini titulo="Presup." valor={dinero(c.presupuesto)} />
                    <Mini titulo="Gasto" valor={dinero(c.gasto_real)} />
                    <Mini titulo="Convs." valor={numero(c.conversaciones)} />
                    <Mini
                      titulo="Costo/conv."
                      valor={
                        c.costo_por_conversacion == null
                          ? '—'
                          : dineroExacto(Number(c.costo_por_conversacion))
                      }
                      tono={
                        c.veredicto === 'matar'
                          ? 'text-danger'
                          : c.veredicto === 'escalar'
                            ? 'text-success'
                            : undefined
                      }
                    />
                  </div>

                  {consumo != null && (
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(consumo * 100, 100)}%` }}
                        transition={{ ...transicion(DURACION.lenta), delay: escalonar(i) }}
                        className={cn(
                          'h-full rounded-full',
                          consumo > 1 ? 'bg-danger' : 'bg-primary/70',
                        )}
                      />
                    </div>
                  )}
                </CardAnimada>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Costo por conversación en el tiempo ──────────────────────── */}
      {nombres.length > 0 && datos.length > 1 && (
        <Card>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Costo por conversación
          </p>
          <div className="mt-3">
            <GraficaCostoConversacion
              datos={datos}
              nombres={nombres}
              bueno={umbrales.umbral_cpc_bueno}
              malo={umbrales.umbral_cpc_malo}
            />
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-fg-subtle">
            Franja verde, por debajo de {dinero(umbrales.umbral_cpc_bueno)}: súbele presupuesto.
            Franja roja, por encima de {dinero(umbrales.umbral_cpc_malo)}: mátalo. En medio,
            déjalo correr un día más.
          </p>
        </Card>
      )}

      {/* ── Captura diaria ───────────────────────────────────────────── */}
      <section>
        <div className="mb-2.5 flex items-end justify-between gap-3">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Registro diario · {(registros ?? []).length}
          </h2>
          {puede && (creativos ?? []).length > 0 && (
            <Button tamano="sm" variante="secundario" onClick={() => abrirDia('nuevo')}>
              <Plus className="h-4 w-4" />
              Registrar día
            </Button>
          )}
        </div>

        {(registros ?? []).length === 0 ? (
          <p className="rounded-2xl arcilla px-4 py-6 text-center text-sm text-fg-subtle">
            {(creativos ?? []).length === 0
              ? 'Primero agrega un creativo; el gasto se captura contra uno de ellos.'
              : 'Sin días capturados. Una fila por creativo por día.'}
          </p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {(registros ?? []).map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: transicion(DURACION.rapida) }}
                transition={{ ...transicion(), delay: escalonar(i, 0.02) }}
                className="flex items-center gap-3 rounded-xl arcilla px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{a.creativo}</p>
                  <p className="text-xs text-fg-subtle">{fechaCorta(a.fecha)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="tabular text-fg">{dinero(a.gasto_real)}</span>
                  <span className="tabular text-fg-subtle">{a.conversaciones} conv.</span>
                  <span
                    className={cn(
                      'tabular w-16 text-right',
                      a.veredicto === 'matar'
                        ? 'text-danger'
                        : a.veredicto === 'escalar'
                          ? 'text-success'
                          : 'text-fg-muted',
                    )}
                  >
                    {a.costo_por_conversacion == null
                      ? '—'
                      : dineroExacto(Number(a.costo_por_conversacion))}
                  </span>
                </div>
                {puede && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => abrirDia(a)}
                      aria-label="Editar registro"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setABorrarDia(a)}
                      aria-label="Eliminar registro"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-danger/12 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Formularios ──────────────────────────────────────────────── */}
      <Sheet
        abierto={Boolean(formCreativo)}
        onCerrar={() => setFormCreativo(null)}
        titulo={formCreativo === 'nuevo' ? 'Nuevo creativo' : 'Editar creativo'}
        descripcion="Su presupuesto sale del total de la campaña."
        pie={
          <Button
            bloque
            tamano="lg"
            cargando={guardarCreativo.isPending}
            onClick={() => void salvarCreativo()}
          >
            Guardar
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            etiqueta="Nombre"
            autoFocus
            placeholder="Creativo A — gótico mano"
            value={nombreCr}
            onChange={(e) => setNombreCr(e.target.value)}
          />
          <InputNumero
            etiqueta="Presupuesto"
            prefijo="$"
            hint={
              sinRepartir > 0 ? `Quedan ${dinero(sinRepartir)} sin repartir` : undefined
            }
            value={presupuestoCr}
            onChange={(e) => setPresupuestoCr(e.target.value.replace(/[^\d.]/g, ''))}
          />
          <div className="rounded-2xl pozo px-3.5 py-1">
            <Switch
              activo={activoCr}
              onCambio={setActivoCr}
              etiqueta="Activo"
              descripcion="Apágalo si ya no está corriendo"
            />
          </div>
        </div>
      </Sheet>

      <Sheet
        abierto={Boolean(formDia)}
        onCerrar={() => setFormDia(null)}
        titulo={formDia === 'nuevo' ? 'Registrar día' : 'Editar registro'}
        descripcion="Una fila por creativo por día."
        pie={
          <Button
            bloque
            tamano="lg"
            cargando={guardarRegistro.isPending}
            onClick={() => void salvarDia()}
          >
            Guardar
          </Button>
        }
      >
        <div className="space-y-4">
          <Select
            etiqueta="Creativo"
            value={creativoDia}
            onChange={(e) => setCreativoDia(e.target.value)}
          >
            {(creativos ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <SelectorFecha etiqueta="Fecha" valor={fechaDia} onCambio={setFechaDia} />
          <div className="grid grid-cols-2 gap-3">
            <InputNumero
              etiqueta="Gasto real"
              prefijo="$"
              value={gastoDia}
              onChange={(e) => setGastoDia(e.target.value.replace(/[^\d.]/g, ''))}
            />
            <InputNumero
              etiqueta="Conversaciones"
              hint="Las que sí escribieron"
              value={convsDia}
              onChange={(e) => setConvsDia(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
      </Sheet>

      <ConfirmarBorrado
        abierto={Boolean(aBorrarCreativo)}
        onCerrar={() => setABorrarCreativo(null)}
        onConfirmar={async () => {
          if (!aBorrarCreativo) return
          try {
            await borrarCreativo.mutateAsync(aBorrarCreativo.id)
            toast.exito('Creativo eliminado')
            setABorrarCreativo(null)
          } catch (e) {
            toast.error(mensajeDeError(e as { message?: string }))
            throw e
          }
        }}
        titulo="¿Eliminar este creativo?"
        descripcion={
          <>
            Se borra <span className="text-fg">{aBorrarCreativo?.nombre}</span> con sus{' '}
            {aBorrarCreativo?.dias_capturados} días capturados. El gasto deja de contar en la
            campaña y en el tablero.
          </>
        }
      />

      <ConfirmarBorrado
        abierto={Boolean(aBorrarDia)}
        onCerrar={() => setABorrarDia(null)}
        onConfirmar={async () => {
          if (!aBorrarDia) return
          try {
            await borrarRegistro.mutateAsync(aBorrarDia.id)
            toast.exito('Registro eliminado')
            setABorrarDia(null)
          } catch (e) {
            toast.error(mensajeDeError(e as { message?: string }))
            throw e
          }
        }}
        titulo="¿Eliminar este registro?"
        descripcion={
          <>
            Se borra el día <span className="text-fg">{fechaCorta(aBorrarDia?.fecha)}</span> de{' '}
            <span className="text-fg">{aBorrarDia?.creativo}</span>.
          </>
        }
      />

      <ConfirmarBorrado
        abierto={borrarTodo}
        onCerrar={() => setBorrarTodo(false)}
        onConfirmar={async () => {
          if (!id) return
          try {
            await borrarCampana.mutateAsync(id)
            toast.exito('Campaña eliminada')
            navegar('/ads')
          } catch (e) {
            toast.error(mensajeDeError(e as { message?: string }))
            throw e
          }
        }}
        titulo="¿Eliminar la campaña completa?"
        descripcion={
          <>
            Se borra <span className="text-fg">{campana.nombre}</span> con sus{' '}
            {plural(campana.num_creativos, 'creativo', 'creativos')} y todos sus días capturados. El
            gasto de{' '}
            {dinero(campana.gasto_real)} deja de contar en el tablero.
          </>
        }
      />
    </div>
  )
}

function Cifra({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">{titulo}</p>
      <p className={cn('tabular font-display mt-1 text-xl font-semibold text-fg', tono)}>{valor}</p>
    </div>
  )
}

function Mini({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2.5 py-2">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {titulo}
      </span>
      <span className={cn('tabular block truncate text-base font-semibold text-fg', tono)}>
        {valor}
      </span>
    </div>
  )
}
