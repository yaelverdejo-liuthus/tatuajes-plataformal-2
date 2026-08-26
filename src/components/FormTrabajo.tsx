import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { useCatalogo } from '../lib/queries/catalogo'
import { useCrearTrabajo, useActualizarTrabajo } from '../lib/queries/trabajos'
import { useUmbrales } from '../lib/queries/config'
import { useToast } from './ui/Toast'
import { Button } from './ui/Button'
import { Input, InputNumero, Select } from './ui/Campo'
import { SelectorFecha } from './ui/SelectorFecha'
import { SelectorHora } from './ui/SelectorHora'
import { InputDuracion } from './ui/InputDuracion'
import { ORIGEN, TRABAJO_ESTATUS, ZONAS } from '../lib/etiquetas'
import { dinero } from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio } from '../lib/errores'
import type { Trabajo } from '../lib/tipos'

const numeroDesdeTexto = (v: unknown) => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

const esquema = z
  .object({
    cliente: z.string().min(1, 'Falta el nombre del cliente'),
    whatsapp: z.string().refine((v) => v.replace(/\D/g, '').length >= 10, 'WhatsApp de 10 dígitos'),
    diseno: z.string().min(1, 'Falta el diseño o el texto'),
    catalogo_id: z.string().optional(),
    nivel: z.enum(['1', '2', '3']),
    zona: z.string().min(1, 'Falta la zona'),
    fecha_trazado: z.string().optional(),
    fecha_tatuaje: z.string().optional(),
    hora: z.string().optional(),
    precio_total: z.preprocess(numeroDesdeTexto, z.number().positive('El precio tiene que ser mayor que cero')),
    anticipo: z.preprocess(numeroDesdeTexto, z.number().min(0, 'No puede ser negativo').nullable()),
    tiempo_diseno_min: z.preprocess(numeroDesdeTexto, z.number().min(0).nullable()),
    tiempo_aplicacion_min: z.preprocess(numeroDesdeTexto, z.number().min(0).nullable()),
    estatus: z.enum(['trazado_agendado', 'trazado_hecho', 'agendado', 'terminado', 'cancelado']),
    origen: z.enum(['tiktok', 'meta', 'organico', 'referido', 'conocido']),
    retoque_pendiente: z.boolean(),
  })
  // Espejo del constraint `agendado_requiere_anticipo`. La base es la que
  // manda; esto solo evita que el usuario descubra la regla con un error
  // crudo de Postgres después de llenar todo el formulario.
  .refine(
    (d) => !['agendado', 'terminado'].includes(d.estatus) || (d.anticipo ?? 0) > 0,
    {
      path: ['anticipo'],
      message: 'Sin anticipo no se agenda. Registra el anticipo cobrado primero.',
    },
  )
  .refine((d) => (d.anticipo ?? 0) <= d.precio_total, {
    path: ['anticipo'],
    message: 'El anticipo no puede ser mayor que el precio total.',
  })

type Formulario = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

export function FormTrabajo({
  inicial,
  trabajoExistente,
  alGuardar,
}: {
  inicial?: Partial<Trabajo>
  trabajoExistente?: Trabajo
  alGuardar?: (t: Trabajo) => void | Promise<void>
}) {
  const { data: catalogo } = useCatalogo()
  const { umbrales } = useUmbrales()
  const crear = useCrearTrabajo()
  const actualizar = useActualizarTrabajo()
  const toast = useToast()

  const base = trabajoExistente ?? inicial ?? {}

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: {
      cliente: base.cliente ?? '',
      whatsapp: base.whatsapp ?? '',
      diseno: base.diseno ?? '',
      catalogo_id: base.catalogo_id ?? '',
      nivel: base.nivel ?? '1',
      zona: base.zona ?? '',
      fecha_trazado: base.fecha_trazado ?? '',
      fecha_tatuaje: base.fecha_tatuaje ?? '',
      hora: base.hora?.slice(0, 5) ?? '',
      precio_total: base.precio_total ?? ('' as unknown as number),
      anticipo: base.anticipo ?? ('' as unknown as number),
      tiempo_diseno_min: base.tiempo_diseno_min ?? ('' as unknown as number),
      tiempo_aplicacion_min: base.tiempo_aplicacion_min ?? ('' as unknown as number),
      estatus: base.estatus ?? 'trazado_agendado',
      origen: base.origen ?? 'meta',
      retoque_pendiente: base.retoque_pendiente ?? false,
    },
  })

  const catalogoId = watch('catalogo_id')
  const estatus = watch('estatus')
  const anticipo = numeroDesdeTexto(watch('anticipo')) ?? 0
  const precio = numeroDesdeTexto(watch('precio_total')) ?? 0

  // Elegir del catálogo precarga nivel, zona y precio — de ahí sale la cotización.
  useEffect(() => {
    if (!catalogoId || !catalogo) return
    const d = catalogo.find((x) => x.id === catalogoId)
    if (!d) return
    setValue('nivel', d.nivel)
    setValue('precio_total', d.precio_base as unknown as never)
    if (d.zona_recomendada) setValue('zona', d.zona_recomendada)
    if (d.tiempo_diseno_estimado_min != null) {
      setValue('tiempo_diseno_min', d.tiempo_diseno_estimado_min as unknown as never)
    }
    if (!d.retoque_incluido) setValue('retoque_pendiente', false)
  }, [catalogoId, catalogo, setValue])

  const anticipoMinimo = umbrales.anticipo_minimo ?? 0
  const anticipoBajo = anticipo > 0 && anticipoMinimo > 0 && anticipo < anticipoMinimo
  const saldo = precio > 0 ? precio - anticipo : null

  async function alEnviar(datos: Salida) {
    const payload = {
      cliente: datos.cliente,
      whatsapp: datos.whatsapp.replace(/\D/g, ''),
      diseno: datos.diseno,
      catalogo_id: datos.catalogo_id || null,
      nivel: datos.nivel,
      zona: datos.zona,
      fecha_trazado: datos.fecha_trazado || null,
      fecha_tatuaje: datos.fecha_tatuaje || null,
      hora: datos.hora || null,
      precio_total: datos.precio_total,
      anticipo: datos.anticipo ?? 0,
      tiempo_diseno_min: datos.tiempo_diseno_min,
      tiempo_aplicacion_min: datos.tiempo_aplicacion_min,
      estatus: datos.estatus,
      origen: datos.origen,
      retoque_pendiente: datos.retoque_pendiente,
      lead_id: base.lead_id ?? null,
    }

    try {
      const guardado = trabajoExistente
        ? await actualizar.mutateAsync({ id: trabajoExistente.id, cambios: payload })
        : await crear.mutateAsync(payload as never)
      toast.exito(trabajoExistente ? 'Trabajo actualizado' : `Trabajo ${guardado.id} creado`)
      await alGuardar?.(guardado)
    } catch (e) {
      const err = e as { message?: string }
      // Si la base bloqueó una regla, se explica en sus términos.
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(alEnviar)} className="space-y-4 pb-2">
      <Input etiqueta="Cliente" error={errors.cliente?.message} {...register('cliente')} />
      <InputNumero
        etiqueta="WhatsApp"
        placeholder="3141234567"
        error={errors.whatsapp?.message}
        {...register('whatsapp')}
      />

      <Select etiqueta="Diseño del catálogo" hint="Precarga nivel, zona y precio" {...register('catalogo_id')}>
        <option value="">Sin catálogo (personalizado)</option>
        {(catalogo ?? []).map((d) => (
          <option key={d.id} value={d.id}>
            {d.id} · {d.nombre} · {dinero(d.precio_base)}
          </option>
        ))}
      </Select>

      <Input
        etiqueta="Diseño / texto"
        placeholder="Lettering 'Emilia'"
        error={errors.diseno?.message}
        {...register('diseno')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select etiqueta="Nivel" error={errors.nivel?.message} {...register('nivel')}>
          <option value="1">Nivel 1</option>
          <option value="2">Nivel 2</option>
          <option value="3">Nivel 3</option>
        </Select>
        <Select etiqueta="Zona" error={errors.zona?.message} {...register('zona')}>
          <option value="">Elegir…</option>
          {ZONAS.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
      </div>

      {/* ── Las dos citas, separadas: son dos eventos distintos ─────── */}
      <fieldset className="space-y-3 rounded-2xl pozo p-3.5">
        <legend className="px-1 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
          Cita de trazado · 20 min
        </legend>
        <SelectorFecha
          etiqueta="Fecha de trazado"
          opcional
          valor={watch('fecha_trazado') ?? ''}
          onCambio={(v) => setValue('fecha_trazado', v, { shouldDirty: true, shouldValidate: true })}
          error={errors.fecha_trazado?.message}
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl pozo p-3.5">
        <legend className="px-1 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
          Cita de tatuaje · la sesión
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <SelectorFecha
            etiqueta="Fecha"
            opcional
            valor={watch('fecha_tatuaje') ?? ''}
            onCambio={(v) =>
              setValue('fecha_tatuaje', v, { shouldDirty: true, shouldValidate: true })
            }
            error={errors.fecha_tatuaje?.message}
          />
          <SelectorHora
            etiqueta="Hora"
            opcional
            valor={watch('hora') ?? ''}
            onCambio={(v) => setValue('hora', v, { shouldDirty: true, shouldValidate: true })}
            error={errors.hora?.message}
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <InputNumero
          etiqueta="Precio total"
          prefijo="$"
          error={errors.precio_total?.message}
          {...register('precio_total')}
        />
        <InputNumero
          etiqueta="Anticipo"
          prefijo="$"
          error={errors.anticipo?.message}
          {...register('anticipo')}
        />
      </div>

      {saldo != null && (
        <p className="-mt-1 text-sm text-fg-subtle">
          Saldo: <span className="tabular text-fg-muted">{dinero(saldo)}</span>{' '}
          <span className="text-fg-subtle">— lo calcula la base al guardar</span>
        </p>
      )}

      {anticipoBajo && (
        <p className="flex items-start gap-2 rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          El anticipo acordado es de {dinero(anticipoMinimo)}. Este es menor — se guarda igual,
          pero quedará registrado así.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <InputDuracion
          etiqueta="Tiempo de diseño"
          valor={numeroDesdeTexto(watch('tiempo_diseno_min'))}
          onCambio={(m) => setValue('tiempo_diseno_min', m as unknown as never)}
          error={errors.tiempo_diseno_min?.message}
        />
        <InputDuracion
          etiqueta="Tiempo de aplicación"
          valor={numeroDesdeTexto(watch('tiempo_aplicacion_min'))}
          onCambio={(m) => setValue('tiempo_aplicacion_min', m as unknown as never)}
          error={errors.tiempo_aplicacion_min?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select etiqueta="Estatus" error={errors.estatus?.message} {...register('estatus')}>
          {Object.entries(TRABAJO_ESTATUS).map(([v, t]) => (
            <option key={v} value={v}>
              {t.texto}
            </option>
          ))}
        </Select>
        <Select etiqueta="Origen" {...register('origen')}>
          {Object.entries(ORIGEN).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {['agendado', 'terminado'].includes(estatus) && anticipo <= 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Sin anticipo no hay cita. La base rechaza este cambio — no es opcional.
        </p>
      )}

      <label className="flex items-center gap-3 py-1 text-base text-fg">
        <input
          type="checkbox"
          className="h-5 w-5 rounded-md border-0 bg-honda text-primary shadow-pozo"
          {...register('retoque_pendiente')}
        />
        Retoque pendiente
      </label>

      <Button type="submit" bloque tamano="lg" cargando={isSubmitting}>
        {trabajoExistente ? 'Guardar cambios' : 'Crear trabajo'}
      </Button>
    </form>
  )
}
