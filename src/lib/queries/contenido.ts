import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Contenido, ContenidoConFiltro } from '../tipos'

export const llavesContenido = { todo: ['contenido'] as const }

/**
 * Se lee de la VISTA, no de la tabla: `pasa_filtro` lo calcula Postgres
 * contra los umbrales de `config`. Si el filtro se calculara aquí, en un mes
 * estaría desincronizado con el que usa el dashboard.
 */
export function useContenido() {
  return useQuery({
    queryKey: llavesContenido.todo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_contenido_filtro')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ContenidoConFiltro[]
    },
  })
}

export type NuevoContenido = Pick<Contenido, 'titulo' | 'plataforma' | 'formato'> &
  Partial<Omit<Contenido, 'id' | 'created_at' | 'created_by'>>

export function useCrearContenido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fila: NuevoContenido) => {
      const { data: sesion } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('contenido')
        .insert({ ...fila, created_by: sesion.user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as Contenido
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesContenido.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useEliminarContenido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contenido').delete().eq('id', id)
      if (error) throw error
    },
    // Sin optimismo al borrar: si RLS lo rechaza, ver la tarjeta desaparecer
    // y reaparecer es peor que esperar el medio segundo que tarda.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesContenido.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useActualizarContenido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Contenido> }) => {
      const { error } = await supabase.from('contenido').update(cambios).eq('id', id)
      if (error) throw error
    },
    // Edición inline de vistas/guardados: tiene que sentirse inmediata.
    onMutate: async ({ id, cambios }) => {
      await qc.cancelQueries({ queryKey: llavesContenido.todo })
      const previo = qc.getQueryData<ContenidoConFiltro[]>(llavesContenido.todo)
      qc.setQueryData<ContenidoConFiltro[]>(llavesContenido.todo, (v) =>
        (v ?? []).map((c) => (c.id === id ? { ...c, ...cambios } : c)),
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesContenido.todo, ctx.previo)
    },
    // Sin optimismo sobre pasa_filtro: ese lo dicta la vista, no el cliente.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesContenido.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
