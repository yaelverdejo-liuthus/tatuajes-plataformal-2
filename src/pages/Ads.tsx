import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Megaphone, Plus } from 'lucide-react'
import { useCampanas, useGuardarCampana } from '../lib/queries/ads'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Input, InputNumero, Select, Switch, Textarea } from '../components/ui/Campo'
import { SelectorFecha } from '../components/ui/SelectorFecha'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { CardAnimada } from '../components/ui/Card'
import { Segmentado } from '../components/ui/Segmentado'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { BotonCSV } from '../components/BotonCSV'
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
import type { CampanaConMetricas } from '../lib/tipos'

const aNumero = (v: unknown) => {
  if (v === '' || v == null) return 0
  const n = Number(String(v).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const esquema = z.object({
  nombre: z.string().min(1, 'Ponle nombre a la campaña'),
  plataforma: z.enum(['meta', 'tiktok']),
  objetivo: z.string().min(1, 'Falta el objetivo'),
  presupuesto_total: z.preprocess(aNumero, z.number().min(0, 'No puede ser negativo')),
  fecha_inicio: z.string().min(1),
  fecha_fin: z.string().optional(),
  activa: z.boolean(),
  notas: z.string().optional(),
})

type Formulario = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

type Filtro = 'activas' | 'todas'
type EnEdicion = CampanaConMetricas | 'nueva' | null

export function Ads() {
  const { data: campanas, isPending, error, refetch } = useCampanas()
  const { puedeEscribir } = useRol()
  const guardar = useGuardarCampana()
  const toast = useToast()
  const navegar = useNavigate()

  const [filtro, setFiltro] = useState<Filtro>('activas')
  const [editando, setEditando] = useState<EnEdicion>(null)

  const puede = puedeEscribir('ads')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({ resolver: zodResolver(esquema) })

  const lista = useMemo(() => {
    const c = campanas ?? []
    return filtro === 'activas' ? c.filter((x) => x.activa) : c
  }, [campanas, filtro])

  const totales = useMemo(() => {
    const c = campanas ?? []
    return {
      gasto: c.reduce((s, x) => s + Number(x.gasto_real), 0),
      conversaciones: c.reduce((s, x) => s + x.conversaciones, 0),
      activas: c.filter((x) => x.activa).length,
    }
  }, [campanas])

  function abrir(destino: EnEdicion) {
    setEditando(destino)
    if (destino === 'nueva') {
      reset({
        nombre: '',
        plataforma: 'meta',
        objetivo: 'Mensajes a WhatsApp',
        presupuesto_total: '' as unknown as number,
        fecha_inicio: hoyISO(),
        fecha_fin: '',
        activa: true,
        notas: '',
      })
    } else if (destino) {
      reset({
        nombre: destino.nombre,
        plataforma: destino.plataforma,
        objetivo: destino.objetivo,
        presupuesto_total: Number(destino.presupuesto_total),
        fecha_inicio: destino.fecha_inicio,
        fecha_fin: destino.fecha_fin ?? '',
        activa: destino.activa,
        notas: destino.notas ?? '',
      })
    }
  }

  async function alGuardar(datos: Salida) {
    try {
      const guardada = await guardar.mutateAsync({
        id: editando !== 'nueva' && editando ? editando.id : undefined,
        datos: {
          nombre: datos.nombre,
          plataforma: datos.plataforma,
          objetivo: datos.objetivo,
          presupuesto_total: datos.presupuesto_total,
          fecha_inicio: datos.fecha_inicio,
          fecha_fin: datos.fecha_fin || null,
          activa: datos.activa,
          notas: datos.notas || null,
        },
      })
      const esNueva = editando === 'nueva'
      setEditando(null)
      toast.exito(esNueva ? 'Campaña creada. Ahora agrégale creativos.' : 'Campaña actualizada')
      if (esNueva) navegar(`/ads/${guardada.id}`)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    }
  }

  const esNueva = editando === 'nueva'

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Pauta</h1>
          <p className="text-sm text-fg-muted">
            <span className="tabular">{dinero(totales.gasto)}</span> gastados ·{' '}
            {plural(totales.conversaciones, 'conversación', 'conversaciones')} ·{' '}
            {plural(totales.activas, 'campaña activa', 'campañas activas')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BotonCSV
            nombre="campanas"
            filas={(campanas ?? []).map((c) => ({
              nombre: c.nombre,
              plataforma: PLATAFORMA_ADS[c.plataforma],
              objetivo: c.objetivo,
              presupuesto_total: c.presupuesto_total,
              presupuesto_asignado: c.presupuesto_asignado,
              creativos: c.num_creativos,
              gasto_real: c.gasto_real,
              conversaciones: c.conversaciones,
              costo_por_conversacion: c.costo_por_conversacion ?? '',
              veredicto: VEREDICTO[c.veredicto].texto,
              fecha_inicio: c.fecha_inicio,
              fecha_fin: c.fecha_fin,
              activa: c.activa ? 'Sí' : 'No',
            }))}
          />
          {puede && (
            <Button
              data-tour="nueva-pauta"
              onClick={() => abrir('nueva')}
              className="hidden md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Nueva campaña
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Segmentado
          idGrupo="pauta"
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { valor: 'activas', etiqueta: 'Activas', conteo: totales.activas },
            { valor: 'todas', etiqueta: 'Todas', conteo: (campanas ?? []).length },
          ]}
        />
        {/* Junto a los filtros y no dentro de cada tarjeta: la duda es sobre
            la columna, no sobre una campaña en particular, y repetir el
            enlace en cada fila sería ruido. */}
        <ExplicacionCostoConv />
      </div>

      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <SkeletonLista />
      ) : lista.length === 0 ? (
        <Vacio
          icono={<Megaphone className="h-6 w-6" />}
          titulo={filtro === 'activas' ? 'Sin campañas activas' : 'Sin campañas'}
          descripcion="Una campaña agrupa sus creativos y su presupuesto. El gasto diario se captura por creativo, y de ahí sale si escalar o matar cada uno."
          accion={puede ? <Button onClick={() => abrir('nueva')}>Crear la primera</Button> : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {lista.map((c, i) => {
              const v = VEREDICTO[c.veredicto]
              const usado = Number(c.presupuesto_total) > 0
                ? Number(c.gasto_real) / Number(c.presupuesto_total)
                : null
              const sinRepartir = Number(c.presupuesto_total) - Number(c.presupuesto_asignado)

              return (
                <CardAnimada key={c.id} indice={i} onClick={() => navegar(`/ads/${c.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-medium text-fg">{c.nombre}</p>
                        {!c.activa && <Badge tono="neutro">Pausada</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-subtle">
                        <span>{PLATAFORMA_ADS[c.plataforma]}</span>
                        <span>{c.objetivo}</span>
                        <span>
                          {c.num_creativos}{' '}
                          {c.num_creativos === 1 ? 'creativo' : 'creativos'}
                        </span>
                        <span>Desde {fechaCorta(c.fecha_inicio)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tono={v.tono} punto>
                        {v.texto}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-fg-subtle" />
                    </div>
                  </div>

                  {/* Presupuesto: cuánto se lleva gastado del autorizado */}
                  {Number(c.presupuesto_total) > 0 && (
                    <div className="mt-3">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-fg-muted">
                          <span className="tabular text-fg">{dinero(c.gasto_real)}</span> de{' '}
                          <span className="tabular">{dinero(c.presupuesto_total)}</span>
                        </span>
                        <span className="tabular text-fg-subtle">{porcentaje(usado)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
                        {/* Se llena al entrar en vez de aparecer llena: el
                            recorrido es lo que comunica cuánto se consumió. */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((usado ?? 0) * 100, 100)}%` }}
                          transition={{ ...transicion(DURACION.lenta), delay: escalonar(i) }}
                          className={cn(
                            'h-full rounded-full',
                            usado != null && usado > 1 ? 'bg-danger' : 'bg-primary',
                          )}
                        />
                      </div>
                      {sinRepartir > 0 && (
                        <p className="mt-1 text-xs text-fg-subtle">
                          {dinero(sinRepartir)} sin repartir entre creativos
                        </p>
                      )}
                      {sinRepartir < 0 && (
                        <p className="mt-1 text-xs text-warn">
                          Los creativos suman {dinero(-sinRepartir)} más que el presupuesto de la
                          campaña
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-3 gap-2">
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
                </CardAnimada>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {puede && (
        <BotonFlotante
          data-tour="nueva-pauta"
          onClick={() => abrir('nueva')}
          aria-label="Nueva campaña"
        >
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      <Sheet
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={esNueva ? 'Nueva campaña' : 'Editar campaña'}
        descripcion={
          esNueva
            ? 'El presupuesto total se reparte después entre sus creativos.'
            : undefined
        }
        pie={
          <Button bloque tamano="lg" cargando={isSubmitting} onClick={handleSubmit(alGuardar)}>
            {esNueva ? 'Crear campaña' : 'Guardar cambios'}
          </Button>
        }
      >
        <form onSubmit={handleSubmit(alGuardar)} className="space-y-4">
          <Input
            etiqueta="Nombre"
            autoFocus
            placeholder="Lettering septiembre"
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select etiqueta="Plataforma" {...register('plataforma')}>
              {Object.entries(PLATAFORMA_ADS).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
            <InputNumero
              etiqueta="Presupuesto total"
              prefijo="$"
              error={errors.presupuesto_total?.message}
              {...register('presupuesto_total')}
            />
          </div>

          <Input
            etiqueta="Objetivo"
            placeholder="Mensajes a WhatsApp"
            error={errors.objetivo?.message}
            {...register('objetivo')}
          />

          <div className="grid grid-cols-2 gap-3">
            <SelectorFecha
              etiqueta="Inicio"
              valor={watch('fecha_inicio') ?? ''}
              onCambio={(v) => setValue('fecha_inicio', v, { shouldDirty: true })}
            />
            <SelectorFecha
              etiqueta="Fin"
              opcional
              hint="Opcional"
              error={errors.fecha_fin?.message}
              valor={watch('fecha_fin') ?? ''}
              onCambio={(v) => setValue('fecha_fin', v, { shouldDirty: true })}
            />
          </div>

          <div className="rounded-2xl pozo px-3.5 py-1">
            <Switch
              activo={Boolean(watch('activa'))}
              onCambio={(v) => setValue('activa', v)}
              etiqueta="Activa"
              descripcion="Las pausadas se esconden del filtro por defecto"
            />
          </div>

          <Textarea etiqueta="Notas" {...register('notas')} />
        </form>
      </Sheet>
    </div>
  )
}

function Mini({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2.5 py-2">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {titulo}
      </span>
      <span className={cn('tabular font-display block truncate text-base font-semibold text-fg', tono)}>
        {valor}
      </span>
    </div>
  )
}
