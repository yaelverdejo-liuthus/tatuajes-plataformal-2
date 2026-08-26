import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/** tabla → llaves de cache que hay que refrescar cuando cambia */
const AFECTA: Record<string, string[][]> = {
  leads: [['leads'], ['dashboard']],
  trabajos: [['trabajos'], ['dashboard']],
  contenido: [['contenido'], ['dashboard']],
  ads: [['ads'], ['dashboard']],
  config: [['config'], ['contenido'], ['ads'], ['dashboard']],
}

/**
 * Estado compartido entre los 3, sin refrescar ni pisarse.
 *
 * No mete el payload al cache a mano: invalida y deja que TanStack Query
 * vuelva a leer. Es más lento por milisegundos y mucho más difícil de
 * desincronizar — sobre todo con columnas generadas (saldo) y vistas
 * (pasa_filtro, veredicto) que el payload de Realtime no trae.
 */
export function useRealtime(activo: boolean) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!activo) return

    const canal = supabase.channel('cambios-app')

    for (const tabla of Object.keys(AFECTA)) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        for (const llave of AFECTA[tabla]) {
          void qc.invalidateQueries({ queryKey: llave })
        }
      })
    }

    void canal.subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [activo, qc])
}
