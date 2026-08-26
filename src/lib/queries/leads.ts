import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Lead, Reprogramacion } from '../tipos'

export const llavesLeads = { todo: ['leads'] as const }
export const llavesReprogramaciones = {
  deLead: (id: string) => ['reprogramaciones', 'lead', id] as const,
}

export function useLeads() {
  return useQuery({
    queryKey: llavesLeads.todo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Lead[]
    },
  })
}

export type NuevoLead = Pick<Lead, 'nombre' | 'whatsapp' | 'origen'> &
  Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'created_by'>>

export function useCrearLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lead: NuevoLead) => {
      const { data: sesion } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...lead, created_by: sesion.user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as Lead
    },
    // Optimistic: la captura debe sentirse instantánea (§3.1 del brief).
    onMutate: async (lead) => {
      await qc.cancelQueries({ queryKey: llavesLeads.todo })
      const previo = qc.getQueryData<Lead[]>(llavesLeads.todo)
      const provisional: Lead = {
        que_pidio: null,
        nivel_estimado: null,
        siguiente_accion: null,
        fecha_seguimiento: null,
        monto_cotizado: null,
        zona: null,
        catalogo_id: null,
        cotizado_en: null,
        fecha_trazado: null,
        fecha_tatuaje: null,
        hora: null,
        motivo_perdida: null,
        ...lead,
        id: `provisional-${Date.now()}`,
        fecha: lead.fecha ?? new Date().toISOString().slice(0, 10),
        estatus: lead.estatus ?? 'nuevo',
        anticipo: lead.anticipo ?? 0,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      qc.setQueryData<Lead[]>(llavesLeads.todo, (v) => [provisional, ...(v ?? [])])
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesLeads.todo, ctx.previo)
    },
    // Trabajos entra aquí porque al quedar "agendado" el trigger de la base
    // crea el expediente: sin refrescar, el tatuador no lo ve aparecer.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: ['trabajos'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/** Historial de movimientos de cita de un lead, del más reciente al primero. */
export function useReprogramaciones(leadId: string | undefined) {
  return useQuery({
    queryKey: llavesReprogramaciones.deLead(leadId ?? ''),
    enabled: Boolean(leadId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reprogramaciones')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Reprogramacion[]
    },
  })
}

/**
 * Mueve la cita y deja constancia de por qué, en una sola operación.
 *
 * El motivo no es opcional: sin él, tres semanas después nadie sabe si el
 * cliente cambió de opinión o si el estudio tuvo que mover la agenda, y esa
 * diferencia es la que dice cuáles citas se van a caer.
 */
export function useReprogramar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      lead,
      fechaNueva,
      horaNueva,
      motivo,
    }: {
      lead: Lead
      fechaNueva: string
      horaNueva: string | null
      motivo: string
    }) => {
      const { data: sesion } = await supabase.auth.getUser()

      const { error: errLead } = await supabase
        .from('leads')
        .update({ fecha_tatuaje: fechaNueva, hora: horaNueva })
        .eq('id', lead.id)
      if (errLead) throw errLead

      const { error: errHist } = await supabase.from('reprogramaciones').insert({
        lead_id: lead.id,
        fecha_anterior: lead.fecha_tatuaje,
        hora_anterior: lead.hora,
        fecha_nueva: fechaNueva,
        hora_nueva: horaNueva,
        motivo,
        created_by: sesion.user?.id ?? null,
      })
      if (errHist) throw errHist
    },
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: llavesReprogramaciones.deLead(v.lead.id) })
      // El trabajo ya creado guarda su propia copia de la fecha.
      void qc.invalidateQueries({ queryKey: ['trabajos'] })
    },
  })
}

/**
 * Un lead ya convertido en trabajo no se puede borrar: lo detiene
 * trabajos_lead_id_fkey. El mensaje lo traduce `mensajeDeError`.
 */
export function useEliminarLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    // Trabajos entra aquí porque al quedar "agendado" el trigger de la base
    // crea el expediente: sin refrescar, el tatuador no lo ve aparecer.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: ['trabajos'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useActualizarLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Lead> }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(cambios)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Lead
    },
    onMutate: async ({ id, cambios }) => {
      await qc.cancelQueries({ queryKey: llavesLeads.todo })
      const previo = qc.getQueryData<Lead[]>(llavesLeads.todo)
      qc.setQueryData<Lead[]>(llavesLeads.todo, (v) =>
        (v ?? []).map((l) => (l.id === id ? { ...l, ...cambios } : l)),
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesLeads.todo, ctx.previo)
    },
    // Trabajos entra aquí porque al quedar "agendado" el trigger de la base
    // crea el expediente: sin refrescar, el tatuador no lo ve aparecer.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: ['trabajos'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
