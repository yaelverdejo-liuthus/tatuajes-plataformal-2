import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Catalogo } from '../tipos'

export const llavesCatalogo = { todo: ['catalogo'] as const }

export function useCatalogo() {
  return useQuery({
    queryKey: llavesCatalogo.todo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo')
        .select('*')
        .order('nivel')
        .order('id')
      if (error) throw error
      return data as Catalogo[]
    },
    staleTime: 60 * 1000,
  })
}

export function useGuardarDiseno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (diseno: Partial<Catalogo> & { id: string }) => {
      const { data, error } = await supabase
        .from('catalogo')
        .upsert(diseno)
        .select()
        .single()
      if (error) throw error
      return data as Catalogo
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: llavesCatalogo.todo }),
  })
}

/**
 * Un diseño usado en algún trabajo no se puede borrar: lo detiene
 * trabajos_catalogo_id_fkey. Para sacarlo del line-up sin romper
 * expedientes, lo correcto es despublicarlo, no borrarlo.
 */
export function useEliminarDiseno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('catalogo').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: llavesCatalogo.todo }),
  })
}

export function useAlternarPublicado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publicado }: { id: string; publicado: boolean }) => {
      const { error } = await supabase.from('catalogo').update({ publicado }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, publicado }) => {
      await qc.cancelQueries({ queryKey: llavesCatalogo.todo })
      const previo = qc.getQueryData<Catalogo[]>(llavesCatalogo.todo)
      qc.setQueryData<Catalogo[]>(llavesCatalogo.todo, (v) =>
        (v ?? []).map((d) => (d.id === id ? { ...d, publicado } : d)),
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesCatalogo.todo, ctx.previo)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: llavesCatalogo.todo }),
  })
}

/**
 * Siguiente id del catálogo para un nivel: N1-01, N1-02…
 * El id lo pone el negocio, no la base, porque se usa al cotizar por WhatsApp.
 */
export function siguienteIdDiseno(existentes: Catalogo[], nivel: string) {
  const delNivel = existentes
    .filter((d) => d.nivel === nivel)
    .map((d) => Number.parseInt(d.id.split('-')[1] ?? '0', 10))
    .filter((n) => Number.isFinite(n))
  const max = delNivel.length ? Math.max(...delNivel) : 0
  return `N${nivel}-${String(max + 1).padStart(2, '0')}`
}
