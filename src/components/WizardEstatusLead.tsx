import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Briefcase, Info } from 'lucide-react'
import { useCatalogo } from '../lib/queries/catalogo'
import { useActualizarLead } from '../lib/queries/leads'
import { useUmbrales } from '../lib/queries/config'
import { useToast } from './ui/Toast'
import { Button } from './ui/Button'
import { InputNumero, Select, Textarea } from './ui/Campo'
import { SelectorFecha } from './ui/SelectorFecha'
import { SelectorHora } from './ui/SelectorHora'
import { Sheet } from './ui/Sheet'
import { LEAD_ESTATUS, ZONAS } from '../lib/etiquetas'
import { dinero, hoyISO } from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio } from '../lib/errores'
import { cn } from '../lib/cn'
import type { Lead, LeadEstatus } from '../lib/tipos'

const aNumero = (v: unknown) => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : null
}

const esquemaBase = z.object({
  monto_cotizado: z.preprocess(aNumero, z.number().positive().nullable()),
  nivel_estimado: z.string(),
  zona: z.string(),
  catalogo_id: z.string(),
  que_pidio: z.string(),
  cotizado_en: z.string(),
  fecha_tatuaje: z.string(),
  hora: z.string(),
  fecha_trazado: z.string(),
  anticipo: z.preprocess(aNumero, z.number().min(0).nullable()),
  motivo_perdida: z.string(),
})

type Formulario = z.input<typeof esquemaBase>
type Salida = z.output<typeof esquemaBase>

type Paso = 'cotizacion' | 'agenda' | 'perdida'

const TITULO: Record<Paso, { titulo: string; texto: string }> = {
  cotizacion: {
    titulo: 'La cotización',
    texto: 'Cuánto se le dijo que cuesta. De aquí sale el precio del trabajo.',
  },
  agenda: {
    titulo: 'La cita',
    texto: 'Cuándo se lo va a tatuar y cuánto dejó de anticipo.',
  },
  perdida: {
    titulo: 'Por qué se perdió',
    texto: 'Sirve para saber si el problema es el precio, el tiempo o el diseño.',
  },
}

/**
 * Asistente para mover un lead de etapa.
 *
 * La gracia está en `pasosNecesarios`: se calcula contra los DATOS que ya
 * tiene el lead, no contra su estatus. Por eso saltar de "nuevo" directo a
 * "agendado" se da cuenta solo de que nunca hubo cotización y la pide antes
 * de la fecha, en el mismo flujo, sin mandar al usuario a otra pantalla.
 *
 * Es el reemplazo de "convertir en trabajo": ese paso pedía otra vez datos
 * ya tecleados y encima no arrastraba nada al expediente.
 */
export function WizardEstatusLead({
  lead,
  destino,
  abierto,
  onCerrar,
}: {
  lead: Lead | null
  destino: LeadEstatus | null
  abierto: boolean
  onCerrar: () => void
}) {
  const { data: catalogo } = useCatalogo()
  const { umbrales } = useUmbrales()
  const actualizar = useActualizarLead()
  const toast = useToast()
  const [indice, setIndice] = useState(0)

  const yaCotizado = lead?.monto_cotizado != null

  /** Qué le falta a ESTE lead para poder declarar la etapa destino. */
  const pasos = useMemo<Paso[]>(() => {
    if (!destino) return []
    if (destino === 'perdido') return ['perdida']
    if (destino === 'nuevo') return []

    const necesarios: Paso[] = []
    // Cotizar es requisito de agendar: no se agenda lo que no tiene precio.
    if (!yaCotizado || destino === 'cotizado') necesarios.push('cotizacion')
    if (destino === 'agendado') necesarios.push('agenda')
    return necesarios
  }, [destino, yaCotizado])

  const paso = pasos[indice]
  const esUltimo = indice === pasos.length - 1

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({
    resolver: zodResolver(esquemaBase),
  })

  useEffect(() => {
    if (!abierto || !lead) return
    setIndice(0)
    reset({
      monto_cotizado: (lead.monto_cotizado ?? '') as unknown as number,
      nivel_estimado: lead.nivel_estimado ?? '',
      zona: lead.zona ?? '',
      catalogo_id: lead.catalogo_id ?? '',
      que_pidio: lead.que_pidio ?? '',
      cotizado_en: lead.cotizado_en ?? hoyISO(),
      fecha_tatuaje: lead.fecha_tatuaje ?? '',
      hora: lead.hora?.slice(0, 5) ?? '',
      fecha_trazado: lead.fecha_trazado ?? '',
      anticipo: (lead.anticipo || '') as unknown as number,
      motivo_perdida: lead.motivo_perdida ?? '',
    })
  }, [abierto, lead, reset])

  const catalogoId = watch('catalogo_id')
  const monto = aNumero(watch('monto_cotizado')) ?? 0
  const anticipo = aNumero(watch('anticipo')) ?? 0

  // Elegir del catálogo precarga precio, nivel y zona: es de donde sale la
  // cotización cuando se cotiza por WhatsApp.
  useEffect(() => {
    if (!catalogoId || !catalogo) return
    const d = catalogo.find((x) => x.id === catalogoId)
    if (!d) return
    setValue('monto_cotizado', d.precio_base as unknown as number)
    setValue('nivel_estimado', d.nivel)
    if (d.zona_recomendada) setValue('zona', d.zona_recomendada)
  }, [catalogoId, catalogo, setValue])

  const anticipoMinimo = umbrales.anticipo_minimo ?? 0
  const anticipoBajo = anticipo > 0 && anticipoMinimo > 0 && anticipo < anticipoMinimo

  /** Validación de la etapa visible, para no dejar avanzar en falso. */
  async function siguiente() {
    if (paso === 'cotizacion') {
      const ok = await trigger(['monto_cotizado'])
      if (!ok || monto <= 0) {
        toast.error('Falta el monto cotizado, que es lo que define esta etapa.')
        return
      }
    }
    if (paso === 'agenda') {
      const fecha = watch('fecha_tatuaje')
      if (!fecha) {
        toast.error('Falta la fecha del tatuaje.')
        return
      }
      if (anticipo <= 0) {
        toast.error('Sin anticipo cobrado no se agenda. Lo bloquea la base, no la pantalla.')
        return
      }
      if (monto > 0 && anticipo > monto) {
        toast.error('El anticipo no puede ser mayor que lo cotizado.')
        return
      }
    }
    setIndice((n) => n + 1)
  }

  async function guardar(datos: Salida) {
    if (!lead || !destino) return

    const cambios: Partial<Lead> = { estatus: destino }

    if (pasos.includes('cotizacion')) {
      cambios.monto_cotizado = datos.monto_cotizado
      cambios.nivel_estimado = (datos.nivel_estimado || null) as Lead['nivel_estimado']
      cambios.zona = datos.zona || null
      cambios.catalogo_id = datos.catalogo_id || null
      cambios.que_pidio = datos.que_pidio || null
      cambios.cotizado_en = datos.cotizado_en || hoyISO()
    }

    if (pasos.includes('agenda')) {
      cambios.fecha_tatuaje = datos.fecha_tatuaje || null
      cambios.hora = datos.hora || null
      cambios.fecha_trazado = datos.fecha_trazado || null
      cambios.anticipo = datos.anticipo ?? 0
      // Al agendar deja de tener sentido perseguirlo: ya cerró.
      cambios.fecha_seguimiento = null
    }

    if (pasos.includes('perdida')) {
      cambios.motivo_perdida = datos.motivo_perdida || null
      cambios.fecha_seguimiento = null
    }

    try {
      await actualizar.mutateAsync({ id: lead.id, cambios })
      toast.exito(
        destino === 'agendado'
          ? 'Agendado. Su expediente ya está en Trabajos.'
          : `Movido a ${LEAD_ESTATUS[destino].texto.toLowerCase()}`,
      )
      onCerrar()
    } catch (e) {
      const err = e as { message?: string }
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  if (!lead || !destino) return null

  // Etapas sin datos que pedir (volver a "nuevo"): se aplica directo.
  if (pasos.length === 0) {
    return (
      <Sheet
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={`Regresar a ${LEAD_ESTATUS[destino].texto.toLowerCase()}`}
        descripcion={lead.nombre}
        pie={
          <Button bloque tamano="lg" cargando={isSubmitting} onClick={handleSubmit(guardar)}>
            Confirmar
          </Button>
        }
      >
        <p className="text-base text-fg-muted">
          El lead vuelve a <span className="text-fg">{LEAD_ESTATUS[destino].texto}</span>. La
          cotización y la cita que ya tenga se conservan.
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`${LEAD_ESTATUS[destino].accion}: ${lead.nombre}`}
      descripcion={TITULO[paso].texto}
      pie={
        <div className="flex gap-2">
          {indice > 0 && (
            <Button
              variante="secundario"
              tamano="lg"
              onClick={() => setIndice((n) => n - 1)}
              aria-label="Paso anterior"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            bloque
            tamano="lg"
            cargando={isSubmitting}
            onClick={esUltimo ? handleSubmit(guardar) : () => void siguiente()}
          >
            {esUltimo ? 'Guardar' : 'Siguiente'}
          </Button>
        </div>
      }
    >
      {/* Progreso: solo si de verdad hay más de una etapa que llenar */}
      {pasos.length > 1 && (
        <div className="mb-4 flex items-center gap-1.5">
          {pasos.map((p, n) => (
            <span
              key={p}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                n <= indice ? 'bg-primary' : 'bg-line-strong',
              )}
            />
          ))}
        </div>
      )}

      {/* El aviso que explica por qué aparece un paso que no se pidió */}
      {pasos.length > 1 && indice === 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-info/25 bg-info/10 px-3.5 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-sm text-info">
            Este lead nunca se cotizó. Antes de agendarlo hay que registrar el precio — va aquí
            mismo, no hace falta salir.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={paso}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold tracking-tight text-fg">{TITULO[paso].titulo}</h3>

          {paso === 'cotizacion' && (
            <>
              <Select
                etiqueta="Diseño del catálogo"
                hint="Precarga precio, nivel y zona"
                {...register('catalogo_id')}
              >
                <option value="">Sin catálogo (personalizado)</option>
                {(catalogo ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} · {d.nombre} · {dinero(d.precio_base)}
                  </option>
                ))}
              </Select>

              <InputNumero
                etiqueta="Monto cotizado"
                prefijo="$"
                autoFocus
                error={errors.monto_cotizado?.message}
                {...register('monto_cotizado')}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select etiqueta="Nivel" {...register('nivel_estimado')}>
                  <option value="">Sin definir</option>
                  <option value="1">Nivel 1</option>
                  <option value="2">Nivel 2</option>
                  <option value="3">Nivel 3</option>
                </Select>
                <Select etiqueta="Zona" {...register('zona')}>
                  <option value="">Sin definir</option>
                  {ZONAS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
              </div>

              <Textarea
                etiqueta="Qué pidió"
                placeholder="Lettering del nombre de su hija, antebrazo"
                hint="Esto se copia como el diseño del trabajo"
                {...register('que_pidio')}
              />

              <SelectorFecha
                etiqueta="Fecha de la cotización"
                valor={watch('cotizado_en') ?? ''}
                onCambio={(v) => setValue('cotizado_en', v, { shouldDirty: true })}
              />
            </>
          )}

          {paso === 'agenda' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <SelectorFecha
                  etiqueta="Fecha del tatuaje"
                  valor={watch('fecha_tatuaje') ?? ''}
                  onCambio={(v) => setValue('fecha_tatuaje', v, { shouldDirty: true })}
                />
                <SelectorHora
                  etiqueta="Hora"
                  opcional
                  valor={watch('hora') ?? ''}
                  onCambio={(v) => setValue('hora', v, { shouldDirty: true })}
                />
              </div>

              <SelectorFecha
                etiqueta="Fecha de trazado"
                opcional
                hint="Opcional. Son 20 min con marcador sobre el cuerpo, antes de la sesión."
                valor={watch('fecha_trazado') ?? ''}
                onCambio={(v) => setValue('fecha_trazado', v, { shouldDirty: true })}
              />

              <InputNumero
                etiqueta="Anticipo cobrado"
                prefijo="$"
                error={errors.anticipo?.message}
                {...register('anticipo')}
              />

              {monto > 0 && (
                <p className="-mt-1 text-sm text-fg-subtle">
                  Cotizado <span className="tabular text-fg-muted">{dinero(monto)}</span> · saldo{' '}
                  <span className="tabular text-fg-muted">{dinero(monto - anticipo)}</span>
                </p>
              )}

              {anticipoBajo && (
                <p className="rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
                  El anticipo acordado es de {dinero(anticipoMinimo)}. Este es menor — se guarda
                  igual, pero queda registrado así.
                </p>
              )}

              <div className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-sm text-success">
                  Al guardar se crea solo su expediente en Trabajos, con el precio, la zona, las
                  fechas y el anticipo ya puestos.
                </p>
              </div>
            </>
          )}

          {paso === 'perdida' && (
            <Textarea
              etiqueta="Motivo"
              autoFocus
              placeholder="Le pareció caro / ya no contestó / se fue con otro"
              error={errors.motivo_perdida?.message}
              {...register('motivo_perdida')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  )
}
