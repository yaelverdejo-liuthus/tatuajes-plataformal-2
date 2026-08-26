import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useReprogramar, useReprogramaciones } from '../lib/queries/leads'
import { useToast } from './ui/Toast'
import { Button } from './ui/Button'
import { Textarea } from './ui/Campo'
import { SelectorFecha } from './ui/SelectorFecha'
import { SelectorHora } from './ui/SelectorHora'
import { Sheet } from './ui/Sheet'
import { fechaCorta, hora12 } from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio } from '../lib/errores'
import type { Lead } from '../lib/tipos'

/**
 * Mover una cita, con motivo obligatorio y su historial a la vista.
 *
 * El motivo no se pide por burocracia: sin él, tres semanas después nadie
 * distingue al cliente que cambió de opinión dos veces del que se movió
 * porque el estudio no pudo. El primero se va a caer; el segundo no.
 */
export function ReprogramarCita({
  lead,
  abierto,
  onCerrar,
}: {
  lead: Lead | null
  abierto: boolean
  onCerrar: () => void
}) {
  const reprogramar = useReprogramar()
  const { data: historial } = useReprogramaciones(lead?.id)
  const toast = useToast()

  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (!abierto || !lead) return
    setFecha(lead.fecha_tatuaje ?? '')
    setHora(lead.hora?.slice(0, 5) ?? '')
    setMotivo('')
  }, [abierto, lead])

  async function guardar() {
    if (!lead) return
    if (!fecha) {
      toast.error('Falta la fecha nueva.')
      return
    }
    if (!motivo.trim()) {
      toast.error('Escribe el motivo. Es lo que hace útil el historial.')
      return
    }
    if (fecha === lead.fecha_tatuaje && (hora || null) === (lead.hora?.slice(0, 5) || null)) {
      toast.error('La fecha y la hora son las mismas. No hay nada que mover.')
      return
    }

    try {
      await reprogramar.mutateAsync({
        lead,
        fechaNueva: fecha,
        horaNueva: hora || null,
        motivo: motivo.trim(),
      })
      toast.exito('Cita movida y registrada en el historial')
      onCerrar()
    } catch (e) {
      const err = e as { message?: string }
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  if (!lead) return null

  const veces = historial?.length ?? 0

  return (
    <Sheet
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Mover la cita"
      descripcion={lead.nombre}
      pie={
        <Button bloque tamano="lg" cargando={reprogramar.isPending} onClick={() => void guardar()}>
          Guardar el cambio
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-2 px-3.5 py-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Cita actual
          </p>
          <p className="mt-0.5 text-base text-fg">
            {fechaCorta(lead.fecha_tatuaje)}
            {lead.hora ? ` · ${hora12(lead.hora)}` : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectorFecha etiqueta="Nueva fecha" valor={fecha} onCambio={setFecha} />
          <SelectorHora etiqueta="Nueva hora" opcional valor={hora} onCambio={setHora} />
        </div>

        <Textarea
          etiqueta="Motivo"
          placeholder="El cliente pidió moverla / se empalmó con otra sesión"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        {veces >= 2 && (
          <p className="rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">
            Esta cita ya se movió {veces} veces. A partir de la tercera conviene volver a
            confirmar el anticipo antes de reservar el espacio.
          </p>
        )}

        {veces > 0 && (
          <div>
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
              Historial
            </p>
            <ul className="space-y-2">
              {historial?.map((r) => (
                <li key={r.id} className="flex gap-2.5 rounded-xl bg-surface-2 px-3.5 py-2.5">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg">
                      {fechaCorta(r.fecha_anterior)} → {fechaCorta(r.fecha_nueva)}
                      {r.hora_nueva ? ` · ${hora12(r.hora_nueva)}` : ''}
                    </p>
                    <p className="mt-0.5 text-sm text-fg-muted">{r.motivo}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  )
}
