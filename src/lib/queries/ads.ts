import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type {
  Ad,
  AdConVeredicto,
  Campana,
  CampanaConMetricas,
  Creativo,
  CreativoConMetricas,
} from '../tipos'

export const llavesAds = {
  campanas: ['campanas'] as const,
  campana: (id: string) => ['campanas', id] as const,
  creativos: (campanaId: string) => ['creativos', campanaId] as const,
  registros: (campanaId: string) => ['ads', 'campana', campanaId] as const,
  creativosTodos: ['creativos'] as const,
}

/**
 * Invalida la pauta entera.
 *
 * Los tres niveles son vistas agregadas del mismo dato: capturar un día
 * mueve el total del creativo y el de la campaña. Refrescar solo el nivel
 * tocado deja los otros dos mintiendo hasta el siguiente refetch.
 */
function refrescarPauta(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['campanas'] })
  void qc.invalidateQueries({ queryKey: ['creativos'] })
  void qc.invalidateQueries({ queryKey: ['ads'] })
  void qc.invalidateQueries({ queryKey: ['dashboard'] })
}

// ── Campañas ──────────────────────────────────────────────────────────

export function useCampanas() {
  return useQuery({
    queryKey: llavesAds.campanas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_campanas')
        .select('*')
        .order('activa', { ascending: false })
        .order('fecha_inicio', { ascending: false })
      if (error) throw error
      return data as CampanaConMetricas[]
    },
  })
}

export function useCampana(id: string | undefined) {
  return useQuery({
    queryKey: llavesAds.campana(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_campanas')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as CampanaConMetricas
    },
  })
}

export type NuevaCampana = Pick<Campana, 'nombre' | 'plataforma'> & Partial<Campana>

export function useGuardarCampana() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: string; datos: NuevaCampana }) => {
      const q = id
        ? supabase.from('campanas').update(datos).eq('id', id).select().single()
        : supabase.from('campanas').insert(datos).select().single()
      const { data, error } = await q
      if (error) throw error
      return data as Campana
    },
    onSettled: () => refrescarPauta(qc),
  })
}

export function useEliminarCampana() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Creativos y registros caen con ella por ON DELETE CASCADE.
      const { error } = await supabase.from('campanas').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => refrescarPauta(qc),
  })
}

// ── Creativos ─────────────────────────────────────────────────────────

export function useCreativos(campanaId: string | undefined) {
  return useQuery({
    queryKey: llavesAds.creativos(campanaId ?? ''),
    enabled: Boolean(campanaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_creativos')
        .select('*')
        .eq('campana_id', campanaId!)
        .order('created_at')
      if (error) throw error
      return data as CreativoConMetricas[]
    },
  })
}

/** Todos los creativos, para el aviso de "matar" del tablero. */
export function useCreativosTodos() {
  return useQuery({
    queryKey: llavesAds.creativosTodos,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_creativos').select('*')
      if (error) throw error
      return data as CreativoConMetricas[]
    },
  })
}

export function useGuardarCreativo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: string; datos: Partial<Creativo> }) => {
      const q = id
        ? supabase.from('creativos').update(datos).eq('id', id).select().single()
        : supabase.from('creativos').insert(datos).select().single()
      const { data, error } = await q
      if (error) throw error
      return data as Creativo
    },
    onSettled: () => refrescarPauta(qc),
  })
}

export function useEliminarCreativo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creativos').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => refrescarPauta(qc),
  })
}

// ── Registros diarios ─────────────────────────────────────────────────

export function useRegistrosDeCampana(campanaId: string | undefined) {
  return useQuery({
    queryKey: llavesAds.registros(campanaId ?? ''),
    enabled: Boolean(campanaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ads_veredicto')
        .select('*')
        .eq('campana_id', campanaId!)
        .order('fecha', { ascending: false })
      if (error) throw error
      return data as AdConVeredicto[]
    },
  })
}

export type NuevoRegistro = Pick<Ad, 'creativo_id' | 'fecha'> &
  Partial<Pick<Ad, 'gasto_real' | 'conversaciones'>>

export function useGuardarRegistro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: string; datos: NuevoRegistro }) => {
      const q = id
        ? supabase.from('ads').update(datos).eq('id', id).select().single()
        : supabase.from('ads').insert(datos).select().single()
      const { data, error } = await q
      if (error) throw error
      return data as Ad
    },
    onSettled: () => refrescarPauta(qc),
  })
}

export function useEliminarRegistro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ads').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => refrescarPauta(qc),
  })
}
