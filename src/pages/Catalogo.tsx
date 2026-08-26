import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ImageIcon, ImagePlus, Plus, Trash2 } from 'lucide-react'
import {
  useCatalogo,
  useGuardarDiseno,
  useAlternarPublicado,
  useEliminarDiseno,
  siguienteIdDiseno,
} from '../lib/queries/catalogo'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Input, InputNumero, Select, Textarea, Switch } from '../components/ui/Campo'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { Vacio, ErrorCarga, Skeleton } from '../components/ui/Estados'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { SubidorImagen } from '../components/SubidorImagen'
import { borrarImagenPorUrl } from '../lib/storage'
import { AUTORIA, NIVEL, ZONAS } from '../lib/etiquetas'
import { dinero, minutosAHoras, plural } from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio, esDependencia } from '../lib/errores'
import { cn } from '../lib/cn'
import type { Catalogo as Diseno, Nivel } from '../lib/tipos'

const esquema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1, 'Falta el nombre'),
  nivel: z.enum(['1', '2', '3']),
  tipografia: z.string().optional(),
  tamano_cm: z.string().optional(),
  zona_recomendada: z.string().optional(),
  precio_base: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(String(v).replace(/[^\d.]/g, ''))),
    z.number().positive('El precio tiene que ser mayor que cero'),
  ),
  autoria: z.enum(['propio', 'referencia', 'hibrido']),
  retoque_incluido: z.boolean(),
  tiempo_diseno_estimado_min: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(String(v).replace(/\D/g, ''))),
    z.number().min(0).nullable(),
  ),
  imagen_url: z.string().url('Debe ser una URL').or(z.literal('')).optional(),
  publicado: z.boolean(),
  notas: z.string().optional(),
})

type Formulario = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

export function Catalogo() {
  const { data: catalogo, isPending, error, refetch } = useCatalogo()
  const { puedeEscribir } = useRol()
  const guardar = useGuardarDiseno()
  const alternar = useAlternarPublicado()
  const eliminar = useEliminarDiseno()
  const toast = useToast()
  const [editando, setEditando] = useState<Diseno | 'nuevo' | null>(null)
  const [aBorrar, setABorrar] = useState<Diseno | null>(null)

  const puede = puedeEscribir('catalogo')

  const porNivel = useMemo(() => {
    const mapa: Record<Nivel, Diseno[]> = { '1': [], '2': [], '3': [] }
    for (const d of catalogo ?? []) mapa[d.nivel].push(d)
    return mapa
  }, [catalogo])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({ resolver: zodResolver(esquema) })

  const zonaElegida = watch('zona_recomendada')
  const retoque = watch('retoque_incluido')
  const esMano = zonaElegida === 'Mano'

  // Mano siempre lleva retoque incluido (constraint mano_requiere_retoque).
  // Se activa solo y se bloquea el apagado, en vez de dejar al usuario
  // chocar contra el error de la base.
  useEffect(() => {
    if (esMano && !retoque) setValue('retoque_incluido', true)
  }, [esMano, retoque, setValue])

  function abrir(d: Diseno | 'nuevo') {
    setEditando(d)
    if (d === 'nuevo') {
      reset({
        id: siguienteIdDiseno(catalogo ?? [], '1'),
        nombre: '',
        nivel: '1',
        autoria: 'propio',
        retoque_incluido: false,
        publicado: false,
        precio_base: '' as unknown as number,
        tiempo_diseno_estimado_min: '' as unknown as number,
      })
    } else {
      reset({
        ...d,
        tipografia: d.tipografia ?? '',
        tamano_cm: d.tamano_cm ?? '',
        zona_recomendada: d.zona_recomendada ?? '',
        imagen_url: d.imagen_url ?? '',
        notas: d.notas ?? '',
        precio_base: d.precio_base,
        tiempo_diseno_estimado_min: d.tiempo_diseno_estimado_min ?? ('' as unknown as number),
      })
    }
  }

  async function alGuardar(datos: Salida) {
    try {
      await guardar.mutateAsync({
        ...datos,
        tipografia: datos.tipografia || null,
        tamano_cm: datos.tamano_cm || null,
        zona_recomendada: datos.zona_recomendada || null,
        imagen_url: datos.imagen_url || null,
        notas: datos.notas || null,
      })
      toast.exito('Diseño guardado')
      setEditando(null)
    } catch (e) {
      const err = e as { message?: string }
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  async function borrar() {
    if (!aBorrar) return
    try {
      await eliminar.mutateAsync(aBorrar.id)
      // La fila ya no existe: su foto en el bucket solo ocuparía espacio.
      void borrarImagenPorUrl(aBorrar.imagen_url)
      toast.exito('Diseño eliminado')
      setABorrar(null)
      setEditando(null)
    } catch (e) {
      const err = e as { message?: string }
      // Usado en un trabajo: no es un fallo, y el camino correcto es
      // despublicarlo, que es justo lo que dice el mensaje.
      if (esDependencia(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
      throw e
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Catálogo</h1>
          <p className="text-sm text-fg-muted">
            {plural((catalogo ?? []).length, 'diseño', 'diseños')} · de aquí sale la cotización
          </p>
        </div>
        {puede && (
          <Button onClick={() => abrir('nuevo')} className="hidden md:inline-flex">
            <Plus className="h-4 w-4" />
            Nuevo diseño
          </Button>
        )}
      </header>

      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (catalogo ?? []).length === 0 ? (
        <Vacio
          icono={<ImageIcon className="h-6 w-6" />}
          titulo="Catálogo vacío"
          descripcion="Los diseños del line-up con su nivel, precio y zona recomendada."
          accion={puede ? <Button onClick={() => abrir('nuevo')}>Agregar el primero</Button> : undefined}
        />
      ) : (
        (['1', '2', '3'] as Nivel[]).map((nivel) =>
          porNivel[nivel].length === 0 ? null : (
            <section key={nivel}>
              <div className="mb-3">
                <h2 className="text-base font-medium text-fg">{NIVEL[nivel].texto}</h2>
                <p className="text-sm text-fg-subtle">{NIVEL[nivel].descripcion}</p>
              </div>

              <div data-tour="catalogo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {porNivel[nivel].map((d, i) => (
                  <motion.article
                    key={d.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: Math.min(i, 8) * 0.03,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={cn(
                      'arcilla overflow-hidden rounded-2xl',
                      !d.publicado && 'opacity-70',
                    )}
                  >
                    <button
                      onClick={() => puede && abrir(d)}
                      disabled={!puede}
                      className="block w-full text-left"
                    >
                      {d.imagen_url ? (
                        <img
                          src={d.imagen_url}
                          alt={d.nombre}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        /* Conserva el 4/3 aunque no haya foto: en una
                           rejilla, dos alturas distintas dejan las fichas
                           desalineadas y eso se nota más que el hueco. */
                        <div className="trama-stencil flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 bg-surface-2">
                          <span className="font-display text-2xl font-semibold tracking-tight text-fg-subtle">
                            {d.id}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                            {puede ? 'Agregar foto' : 'Sin foto'}
                          </span>
                        </div>
                      )}

                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-base font-medium text-fg">
                            {d.nombre}
                          </p>
                          <span className="tabular shrink-0 text-base font-semibold text-fg">
                            {dinero(d.precio_base)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge tono={AUTORIA[d.autoria].tono}>{AUTORIA[d.autoria].texto}</Badge>
                          {d.retoque_incluido && <Badge tono="exito">Retoque incluido</Badge>}
                          {d.zona_recomendada && <Badge tono="neutro">{d.zona_recomendada}</Badge>}
                        </div>

                        {AUTORIA[d.autoria].credito && (
                          <p className="mt-2 text-xs italic text-fg-subtle">
                            {AUTORIA[d.autoria].credito}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-fg-subtle">
                          {[
                            d.tipografia,
                            d.tamano_cm ? `${d.tamano_cm} cm` : null,
                            d.tiempo_diseno_estimado_min != null
                              ? `${minutosAHoras(d.tiempo_diseno_estimado_min)} de diseño`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </button>

                    {puede && (
                      <button
                        onClick={() =>
                          alternar.mutate({ id: d.id, publicado: !d.publicado })
                        }
                        className="flex h-11 w-full items-center justify-center gap-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                      >
                        {d.publicado ? (
                          <>
                            <Eye className="h-4 w-4" /> Publicado
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" /> Sin publicar
                          </>
                        )}
                      </button>
                    )}
                  </motion.article>
                ))}
              </div>
            </section>
          ),
        )
      )}

      {puede && (
        <BotonFlotante onClick={() => abrir('nuevo')} aria-label="Nuevo diseño">
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      <Sheet
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={editando === 'nuevo' ? 'Nuevo diseño' : 'Editar diseño'}
        descripcion={editando && editando !== 'nuevo' ? editando.id : undefined}
        pie={
          <Button bloque tamano="lg" cargando={isSubmitting} onClick={handleSubmit(alGuardar)}>
            Guardar diseño
          </Button>
        }
      >
        <form onSubmit={handleSubmit(alGuardar)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              etiqueta="ID"
              hint="N1-01, N3-02…"
              error={errors.id?.message}
              {...register('id')}
            />
            <Select
              etiqueta="Nivel"
              {...register('nivel', {
                onChange: (e) => {
                  if (editando === 'nuevo') {
                    setValue('id', siguienteIdDiseno(catalogo ?? [], e.target.value))
                  }
                },
              })}
            >
              <option value="1">Nivel 1</option>
              <option value="2">Nivel 2</option>
              <option value="3">Nivel 3</option>
            </Select>
          </div>

          <Input etiqueta="Nombre" error={errors.nombre?.message} {...register('nombre')} />

          <div className="grid grid-cols-2 gap-3">
            <Input etiqueta="Tipografía" {...register('tipografia')} />
            <Input etiqueta="Tamaño (cm)" placeholder="8-12" {...register('tamano_cm')} />
          </div>

          <Select etiqueta="Zona recomendada" {...register('zona_recomendada')}>
            <option value="">Sin zona fija</option>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <InputNumero
              etiqueta="Precio base"
              prefijo="$"
              error={errors.precio_base?.message}
              {...register('precio_base')}
            />
            <InputNumero
              etiqueta="Diseño estimado"
              hint="minutos"
              {...register('tiempo_diseno_estimado_min')}
            />
          </div>

          <Select etiqueta="Autoría" {...register('autoria')}>
            {Object.entries(AUTORIA).map(([v, t]) => (
              <option key={v} value={v}>
                {t.texto}
              </option>
            ))}
          </Select>

          <SubidorImagen
            valor={watch('imagen_url') || null}
            onCambio={(url) => setValue('imagen_url', url ?? '')}
            carpeta="catalogo"
            nombreBase={watch('id') || 'diseno'}
            etiqueta="Foto del diseño"
            hint="La foto real de la pieza, no una ilustración genérica"
          />

          <div className="rounded-2xl pozo px-3.5 py-1">
            <Switch
              activo={Boolean(retoque)}
              onCambio={(v) => setValue('retoque_incluido', v)}
              etiqueta="Retoque incluido"
              descripcion={
                esMano
                  ? 'Obligatorio en mano: la zona retiene mal la tinta'
                  : 'Va incluido en el precio base'
              }
              disabled={esMano}
            />
          </div>

          {esMano && (
            <p className="rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
              Zona Mano: el retoque queda incluido por obligación y no se puede quitar. Si no va
              en el precio desde el catálogo, se olvida y se terminan regalando horas.
            </p>
          )}

          <div className="rounded-2xl pozo px-3.5 py-1">
            <Switch
              activo={Boolean(watch('publicado'))}
              onCambio={(v) => setValue('publicado', v)}
              etiqueta="Publicado"
              descripcion="Visible como opción al cotizar"
            />
          </div>

          <Textarea etiqueta="Notas" {...register('notas')} />

          {editando && editando !== 'nuevo' && (
            <div className="pt-4">
              <Button
                type="button"
                variante="peligro"
                bloque
                onClick={() => setABorrar(editando)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar diseño
              </Button>
              <p className="mt-2 text-xs text-fg-subtle">
                Si ya se tatuó alguna vez, despublícalo en vez de borrarlo: así sale de la
                cotización sin romper el expediente de ese trabajo.
              </p>
            </div>
          )}
        </form>
      </Sheet>

      <ConfirmarBorrado
        abierto={Boolean(aBorrar)}
        onCerrar={() => setABorrar(null)}
        onConfirmar={borrar}
        titulo="¿Eliminar este diseño?"
        descripcion={
          <>
            Se borra <span className="text-fg">{aBorrar?.id}</span> ·{' '}
            <span className="text-fg">{aBorrar?.nombre}</span> del catálogo, con su precio y su
            zona.
          </>
        }
      />
    </div>
  )
}
