import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { ConfigFila } from '../tipos'

export const llavesConfig = { todo: ['config'] as const }

export function useConfig() {
  return useQuery({
    queryKey: llavesConfig.todo,
    queryFn: async () => {
      const { data, error } = await supabase.from('config').select('*').order('clave')
      if (error) throw error
      return data as ConfigFila[]
    },
    // Los umbrales casi no cambian; no tiene caso repreguntarlos seguido.
    staleTime: 5 * 60 * 1000,
  })
}

/** Mapa clave → valor, para leer umbrales sin buscar en el arreglo. */
export function useUmbrales() {
  const { data, ...resto } = useConfig()
  const mapa = Object.fromEntries((data ?? []).map((c) => [c.clave, Number(c.valor)])) as Record<
    string,
    number
  >
  return { umbrales: mapa, ...resto }
}

export function useGuardarConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clave, valor }: { clave: string; valor: number }) => {
      const { error } = await supabase.from('config').update({ valor }).eq('clave', clave)
      if (error) throw error
    },
    onMutate: async ({ clave, valor }) => {
      await qc.cancelQueries({ queryKey: llavesConfig.todo })
      const previo = qc.getQueryData<ConfigFila[]>(llavesConfig.todo)
      qc.setQueryData<ConfigFila[]>(llavesConfig.todo, (v) =>
        (v ?? []).map((c) => (c.clave === clave ? { ...c, valor } : c)),
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesConfig.todo, ctx.previo)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesConfig.todo })
      // los umbrales alimentan las vistas: filtro de contenido, veredicto, dashboard
      void qc.invalidateQueries({ queryKey: ['contenido'] })
      void qc.invalidateQueries({ queryKey: ['ads'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
