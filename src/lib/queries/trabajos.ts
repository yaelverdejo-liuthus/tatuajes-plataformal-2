import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Trabajo } from '../tipos'

export const llavesTrabajos = {
  todo: ['trabajos'] as const,
  uno: (id: string) => ['trabajos', id] as const,
}

export function useTrabajos() {
  return useQuery({
    queryKey: llavesTrabajos.todo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trabajos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Trabajo[]
    },
  })
}

export function useTrabajo(id: string | undefined) {
  return useQuery({
    queryKey: llavesTrabajos.uno(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('trabajos').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Trabajo
    },
  })
}

/**
 * Siguiente folio: T-001, T-002…
 *
 * Se calcula sobre el máximo existente. Con 3 usuarios y este volumen el
 * riesgo de choque es despreciable, y si dos capturan al mismo tiempo la
 * llave primaria rechaza el segundo y se reintenta con el folio siguiente.
 */
export async function siguienteIdTrabajo(): Promise<string> {
  const { data, error } = await supabase
    .from('trabajos')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
  if (error) throw error
  const ultimo = data?.[0]?.id ?? 'T-000'
  const n = Number.parseInt(ultimo.replace(/\D/g, ''), 10) || 0
  return `T-${String(n + 1).padStart(3, '0')}`
}

export type NuevoTrabajo = Omit<
  Trabajo,
  'saldo' | 'minutos_totales' | 'created_at' | 'updated_at' | 'id'
> & { id?: string }

export function useCrearTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (trabajo: NuevoTrabajo) => {
      let id = trabajo.id ?? (await siguienteIdTrabajo())

      for (let intento = 0; intento < 3; intento++) {
        const { data, error } = await supabase
          .from('trabajos')
          .insert({ ...trabajo, id })
          .select()
          .single()

        // 23505 = folio ya tomado por otro usuario; toma el siguiente.
        if (error?.code === '23505') {
          id = await siguienteIdTrabajo()
          continue
        }
        if (error) throw error
        return data as Trabajo
      }
      throw new Error('No se pudo asignar folio. Vuelve a intentar.')
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesTrabajos.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Registra un cobro posterior al anticipo.
 *
 * Suma sobre `abonos` en vez de fijar el total para que dos cobros seguidos
 * no se pisen, y sin tocar `anticipo`: ese número tiene que seguir diciendo
 * qué se cobró por adelantado, que es lo que sostiene la regla de la cita.
 */
export function useRegistrarCobro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trabajo, monto }: { trabajo: Trabajo; monto: number }) => {
      const nuevos = Number(trabajo.abonos ?? 0) + monto
      const { data, error } = await supabase
        .from('trabajos')
        .update({ abonos: nuevos })
        .eq('id', trabajo.id)
        .select()
        .single()
      if (error) throw error
      return data as Trabajo
    },
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: llavesTrabajos.todo })
      void qc.invalidateQueries({ queryKey: llavesTrabajos.uno(v.trabajo.id) })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Un trabajo con videos ligados no se puede borrar: lo detiene
 * contenido_trabajo_id_fkey. Es a propósito — si el expediente se va,
 * el video queda apuntando a un fantasma y el filtro deja de cuadrar.
 */
export function useEliminarTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trabajos').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: (_d, _e, id) => {
      void qc.invalidateQueries({ queryKey: llavesTrabajos.todo })
      qc.removeQueries({ queryKey: llavesTrabajos.uno(id) })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useActualizarTrabajo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Trabajo> }) => {
      // saldo y minutos_totales son columnas generadas: la base las calcula.
      const { saldo: _s, minutos_totales: _m, ...limpio } = cambios
      const { data, error } = await supabase
        .from('trabajos')
        .update(limpio)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Trabajo
    },
    onMutate: async ({ id, cambios }) => {
      await qc.cancelQueries({ queryKey: llavesTrabajos.todo })
      const previoLista = qc.getQueryData<Trabajo[]>(llavesTrabajos.todo)
      const previoUno = qc.getQueryData<Trabajo>(llavesTrabajos.uno(id))

      // Se aplica el cambio de inmediato, pero NO se recalcula saldo aquí:
      // el número bueno llega de la base al confirmar.
      qc.setQueryData<Trabajo[]>(llavesTrabajos.todo, (v) =>
        (v ?? []).map((t) => (t.id === id ? { ...t, ...cambios } : t)),
      )
      qc.setQueryData<Trabajo | undefined>(llavesTrabajos.uno(id), (t) =>
        t ? { ...t, ...cambios } : t,
      )
      return { previoLista, previoUno, id }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previoLista) qc.setQueryData(llavesTrabajos.todo, ctx.previoLista)
      if (ctx?.previoUno) qc.setQueryData(llavesTrabajos.uno(ctx.id), ctx.previoUno)
    },
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: llavesTrabajos.todo })
      void qc.invalidateQueries({ queryKey: llavesTrabajos.uno(v.id) })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
