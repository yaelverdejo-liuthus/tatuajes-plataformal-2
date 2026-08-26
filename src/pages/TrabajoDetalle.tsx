import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Camera, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import {
  useTrabajo,
  useActualizarTrabajo,
  useEliminarTrabajo,
  useRegistrarCobro,
} from '../lib/queries/trabajos'
import { useUmbrales } from '../lib/queries/config'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { InputNumero } from '../components/ui/Campo'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Skeleton, ErrorCarga } from '../components/ui/Estados'
import { FormTrabajo } from '../components/FormTrabajo'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { TRABAJO_ESTATUS } from '../lib/etiquetas'
import { supabase } from '../lib/supabase'
import {
  dinero,
  dividir,
  fechaLarga,
  hora12,
  minutosAHoras,
  telFormateado,
  urlWhatsApp,
} from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio, esDependencia } from '../lib/errores'
import { cn } from '../lib/cn'
import type { TrabajoEstatus } from '../lib/tipos'

export function TrabajoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { data: t, isPending, error, refetch } = useTrabajo(id)
  const { umbrales } = useUmbrales()
  const { puedeEscribir } = useRol()
  const actualizar = useActualizarTrabajo()
  const eliminar = useEliminarTrabajo()
  const cobrar = useRegistrarCobro()
  const toast = useToast()
  const inputFoto = useRef<HTMLInputElement>(null)

  const [editando, setEditando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [cobro, setCobro] = useState('')

  const puede = puedeEscribir('trabajos')

  if (error) {
    return (
      <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
    )
  }

  if (isPending || !t) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  // Tarifa real por hora, al vuelo. Este número revela si el nivel 3
  // realmente es rentable: el tiempo de diseño se siente gratis y no lo es.
  const tarifaReal = dividir(Number(t.precio_total), Number(t.minutos_totales) / 60)
  const objetivo = umbrales.tarifa_objetivo_hora ?? 0
  const tonoTarifa =
    tarifaReal == null
      ? 'neutro'
      : tarifaReal > objetivo * 1.5
        ? 'exito'
        : tarifaReal >= objetivo
          ? 'aviso'
          : 'peligro'

  const proporcionDiseno = dividir(
    Number(t.tiempo_diseno_min ?? 0),
    Number(t.minutos_totales || 0),
  )

  const pagado = Number(t.saldo) <= 0 && Number(t.precio_total) > 0

  async function cambiarEstatus(estatus: TrabajoEstatus) {
    if (!t) return
    try {
      await actualizar.mutateAsync({ id: t.id, cambios: { estatus } })
      toast.exito(`Movido a ${TRABAJO_ESTATUS[estatus].texto.toLowerCase()}`)
    } catch (e) {
      const err = e as { message?: string }
      // Aquí es donde pega el constraint agendado_requiere_anticipo.
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  async function subirFoto(archivo: File) {
    if (!t) return
    setSubiendo(true)
    try {
      const ext = archivo.name.split('.').pop() ?? 'jpg'
      const ruta = `zonas/${t.id}-${Date.now()}.${ext}`
      const { error: errSubida } = await supabase.storage
        .from('fotos')
        .upload(ruta, archivo, { upsert: true })
      if (errSubida) throw errSubida

      const { data } = supabase.storage.from('fotos').getPublicUrl(ruta)
      await actualizar.mutateAsync({ id: t.id, cambios: { foto_zona_url: data.publicUrl } })
      toast.exito('Foto de zona guardada')
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    } finally {
      setSubiendo(false)
    }
  }

  async function registrarCobro(monto: number) {
    if (!t) return
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('Escribe cuánto se cobró.')
      return
    }
    if (monto > Number(t.saldo)) {
      toast.error(`El saldo es de ${dinero(Number(t.saldo))}. No se puede cobrar de más.`)
      return
    }
    try {
      await cobrar.mutateAsync({ trabajo: t, monto })
      setCobro('')
      toast.exito(
        monto >= Number(t.saldo) ? 'Liquidado. Este ya no debe nada.' : `Cobro de ${dinero(monto)} registrado`,
      )
    } catch (e) {
      const err = e as { message?: string }
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  async function borrar() {
    if (!t) return
    try {
      await eliminar.mutateAsync(t.id)
      toast.exito(`${t.id} eliminado`)
      navegar('/trabajos')
    } catch (e) {
      const err = e as { message?: string }
      // Con videos ligados la base lo detiene; hay que decir cuál es la salida.
      if (esDependencia(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
      throw e
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navegar('/trabajos')}
        className="-ml-2 flex h-11 items-center gap-1.5 px-2 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Trabajos
      </button>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{t.cliente}</h1>
            <span className="font-mono text-sm text-fg-subtle">{t.id}</span>
          </div>
          <p className="mt-0.5 text-base text-fg-muted">{t.diseno}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tono={TRABAJO_ESTATUS[t.estatus].tono}>{TRABAJO_ESTATUS[t.estatus].texto}</Badge>
            <Badge tono="neutro">Nivel {t.nivel}</Badge>
            <Badge tono="neutro">{t.zona}</Badge>
            {pagado && <Badge tono="exito" punto>Pagado</Badge>}
            {t.retoque_pendiente && <Badge tono="acento">Retoque pendiente</Badge>}
          </div>
        </div>
        {puede && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variante="secundario" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              variante="peligro"
              onClick={() => setConfirmarBorrado(true)}
              aria-label={`Eliminar ${t.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      {/* ── Dinero ───────────────────────────────────────────────────── */}
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra titulo="Precio" valor={dinero(t.precio_total)} />
          <Cifra titulo="Anticipo" valor={dinero(t.anticipo)} />
          <Cifra titulo="Abonos" valor={dinero(Number(t.abonos ?? 0))} />
          <Cifra
            titulo="Saldo"
            valor={dinero(Number(t.saldo))}
            tono={pagado ? 'text-success' : 'text-warn'}
          />
        </div>

        {pagado ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            Pagado por completo.
          </p>
        ) : (
          puede && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem] flex-1">
                <InputNumero
                  etiqueta="Registrar cobro"
                  prefijo="$"
                  placeholder={String(Number(t.saldo))}
                  value={cobro}
                  onChange={(e) => setCobro(e.target.value.replace(/[^\d.]/g, ''))}
                />
              </div>
              <Button
                variante="secundario"
                cargando={cobrar.isPending}
                onClick={() => void registrarCobro(Number(cobro))}
              >
                Abonar
              </Button>
              <Button
                cargando={cobrar.isPending}
                onClick={() => void registrarCobro(Number(t.saldo))}
              >
                Liquidar
              </Button>
            </div>
          )
        )}
      </Card>

      {/* ── Las dos citas, separadas ─────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Cita de trazado
          </p>
          <p className="mt-1.5 text-lg text-fg">{fechaLarga(t.fecha_trazado)}</p>
          <p className="mt-1 text-sm text-fg-subtle">
            20 min · se dibuja con marcador sobre el cuerpo y se fotografía
          </p>
        </Card>

        <Card>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Cita de tatuaje
          </p>
          <p className="mt-1.5 text-lg text-fg">{fechaLarga(t.fecha_tatuaje)}</p>
          <p className="mt-1 text-sm text-fg-subtle">
            {t.hora ? hora12(t.hora) : 'Sin hora asignada'}
            {t.tiempo_aplicacion_min ? ` · ${minutosAHoras(t.tiempo_aplicacion_min)} estimados` : ''}
          </p>
        </Card>
      </div>

      {/* ── Rentabilidad por tiempo ──────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
              Tarifa real por hora
            </p>
            <p
              className={cn(
                'tabular font-display mt-1 text-3xl font-semibold',
                tonoTarifa === 'exito' && 'text-success',
                tonoTarifa === 'aviso' && 'text-warn',
                tonoTarifa === 'peligro' && 'text-danger',
                tonoTarifa === 'neutro' && 'text-fg-subtle',
              )}
            >
              {tarifaReal == null ? '—' : `${dinero(tarifaReal)}/h`}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              {tarifaReal == null
                ? 'Captura los tiempos para saberlo'
                : `Objetivo: ${dinero(objetivo)}/h`}
            </p>
          </div>

          <div className="space-y-1 text-right text-sm">
            <p className="text-fg-subtle">
              Diseño <span className="tabular text-fg">{minutosAHoras(t.tiempo_diseno_min)}</span>
            </p>
            <p className="text-fg-subtle">
              Aplicación{' '}
              <span className="tabular text-fg">{minutosAHoras(t.tiempo_aplicacion_min)}</span>
            </p>
            <p className="text-fg-subtle">
              Total <span className="tabular text-fg">{minutosAHoras(t.minutos_totales)}</span>
            </p>
          </div>
        </div>

        {proporcionDiseno != null && (
          <div className="mt-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${proporcionDiseno * 100}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-accent"
              />
            </div>
            <p className="mt-1.5 text-sm text-fg-subtle">
              {Math.round(proporcionDiseno * 100)}% del tiempo es diseño
              {proporcionDiseno > 0.4 && ' — arriba de 40% estás regalando horas'}
            </p>
          </div>
        )}
      </Card>

      {/* ── Foto de zona ─────────────────────────────────────────────── */}
      <Card>
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
          Foto de zona
        </p>
        {t.foto_zona_url ? (
          <img
            src={t.foto_zona_url}
            alt={`Zona del trabajo ${t.id}`}
            className="mt-3 max-h-80 w-full rounded-xl object-cover"
          />
        ) : (
          <p className="mt-2 text-sm text-fg-muted">
            Todavía no hay foto. Se toma en la cita de trazado.
          </p>
        )}
        {puede && (
          <>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void subirFoto(f)
                e.target.value = ''
              }}
            />
            <Button
              variante="secundario"
              bloque
              className="mt-3"
              cargando={subiendo}
              onClick={() => inputFoto.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {t.foto_zona_url ? 'Reemplazar foto' : 'Tomar foto'}
            </Button>
          </>
        )}
      </Card>

      {/* ── Contacto y estatus ───────────────────────────────────────── */}
      <a
        href={urlWhatsApp(t.whatsapp)}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success/12 text-base font-medium text-success"
      >
        <MessageCircle className="gesto gesto-repicar h-5 w-5" />
        WhatsApp · {telFormateado(t.whatsapp)}
      </a>

      {puede && (
        <Card>
          <p className="mb-2.5 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Mover a
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TRABAJO_ESTATUS) as TrabajoEstatus[]).map((e) => (
              <button
                key={e}
                onClick={() => void cambiarEstatus(e)}
                disabled={t.estatus === e}
                className="rounded-xl pozo px-3.5 py-2.5 text-sm text-fg-muted pulsable hover:text-fg disabled:bg-primary/15 disabled:text-primary disabled:opacity-100"
              >
                {TRABAJO_ESTATUS[e].texto}
              </button>
            ))}
          </div>
          {Number(t.anticipo) <= 0 && (
            <p className="mt-3 text-sm text-warn">
              Sin anticipo cobrado no se puede pasar a agendado ni a terminado. Lo bloquea la
              base, no la pantalla.
            </p>
          )}
        </Card>
      )}

      <Sheet
        abierto={editando}
        onCerrar={() => setEditando(false)}
        titulo={`Editar ${t.id}`}
        descripcion={t.cliente}
      >
        <FormTrabajo trabajoExistente={t} alGuardar={() => setEditando(false)} />
      </Sheet>

      <ConfirmarBorrado
        abierto={confirmarBorrado}
        onCerrar={() => setConfirmarBorrado(false)}
        onConfirmar={borrar}
        titulo={`¿Eliminar ${t.id}?`}
        descripcion={
          <>
            Se borra el expediente de <span className="text-fg">{t.cliente}</span> con su precio,
            su anticipo, sus tiempos y su foto de zona. El ingreso cobrado y la tarifa real por
            hora del tablero se recalculan sin él.
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
