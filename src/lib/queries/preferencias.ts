import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Preferencias } from '../tipos'

/**
 * La llave lleva el id del usuario dentro.
 *
 * Con una llave fija, al cambiar de cuenta sin recargar la app el siguiente
 * heredaba las preferencias del anterior: entrabas como admin y te salía el
 * "no volver a preguntar" que había marcado otro. Todo lo demás en la app
 * es compartido entre los 3, esto no.
 */
export const llavesPreferencias = {
  raiz: ['preferencias'] as const,
  mias: (id: string | undefined) => ['preferencias', id ?? 'sin-sesion'] as const,
}

/**
 * Preferencias del usuario que está en sesión.
 *
 * Viven en la base y no en localStorage a propósito: "no volver a
 * preguntar" tiene que valer también cuando entren desde otro teléfono.
 */
export function useMisPreferencias() {
  const { session } = useAuth()
  const id = session?.user?.id

  return useQuery({
    queryKey: llavesPreferencias.mias(id),
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('preferencias')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error

      // Todavía no tiene fila: por defecto sí se le ofrece el tutorial.
      return (data ?? {
        id,
        mostrar_tutorial: true,
        tutorial_visto_en: null,
        updated_at: new Date().toISOString(),
      }) as Preferencias
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useGuardarPreferencias() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const id = session?.user?.id
  const llave = llavesPreferencias.mias(id)

  return useMutation({
    mutationFn: async (cambios: Partial<Omit<Preferencias, 'id'>>) => {
      if (!id) throw new Error('Sin sesión')
      const { error } = await supabase.from('preferencias').upsert({ id, ...cambios })
      if (error) throw error
    },
    onMutate: async (cambios) => {
      await qc.cancelQueries({ queryKey: llave })
      const previo = qc.getQueryData<Preferencias>(llave)
      qc.setQueryData<Preferencias | null>(llave, (p) => (p ? { ...p, ...cambios } : p))
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llave, ctx.previo)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: llave }),
  })
}
