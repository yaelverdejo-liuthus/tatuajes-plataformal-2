import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { dividir } from '../formato'
import type { DashboardFila } from '../tipos'

export const llavesDashboard = { todo: ['dashboard'] as const }

export function useDashboard() {
  return useQuery({
    queryKey: llavesDashboard.todo,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_dashboard').select('*').single()
      if (error) throw error
      // Postgres devuelve numeric como string en algunos casos: normalizar.
      const n = (v: unknown) => Number(v ?? 0)
      const f = data as Record<string, unknown>
      return {
        ingreso_cobrado: n(f.ingreso_cobrado),
        costo_insumos: n(f.costo_insumos),
        gasto_pauta: n(f.gasto_pauta),
        gasto_promocion_contenido: n(f.gasto_promocion_contenido),
        conversaciones: n(f.conversaciones),
        agendados: n(f.agendados),
        terminados: n(f.terminados),
        nivel_1: n(f.nivel_1),
        nivel_2: n(f.nivel_2),
        nivel_3: n(f.nivel_3),
        horas_invertidas: n(f.horas_invertidas),
        min_diseno: n(f.min_diseno),
        min_aplicacion: n(f.min_aplicacion),
        videos_publicados: n(f.videos_publicados),
        vistas_totales: n(f.vistas_totales),
        videos_aptos: n(f.videos_aptos),
      } satisfies DashboardFila
    },
  })
}

/**
 * Métricas derivadas. TODAS pasan por `dividir()`, que devuelve null en vez
 * de NaN o Infinity — ninguna pantalla debe poder mostrar NaN (§10 spec).
 */
export function derivar(d: DashboardFila | undefined) {
  if (!d) return null

  const totalNiveles = d.nivel_1 + d.nivel_2 + d.nivel_3
  const minTotales = d.min_diseno + d.min_aplicacion

  /*
   * Todo lo que se pagó por distribución: campañas de Pauta + lo que se le
   * metió a videos concretos desde Contenido. Son botones distintos en la
   * app pero el mismo dinero saliendo, así que margen, ROAS, CPC y CAC
   * tienen que medirse contra el total. Contarlo solo a medias hacía ver
   * el negocio más rentable de lo que es.
   */
  const gastoPublicidad = d.gasto_pauta + d.gasto_promocion_contenido

  return {
    gastoPublicidad,
    margenNeto: d.ingreso_cobrado - d.costo_insumos - gastoPublicidad,
    costoPorConversacion: dividir(gastoPublicidad, d.conversaciones),
    cac: dividir(gastoPublicidad, d.terminados),
    ticketPromedio: dividir(d.ingreso_cobrado, d.terminados),
    roas: dividir(d.ingreso_cobrado, gastoPublicidad),
    tasaCierre: dividir(d.agendados, d.conversaciones),
    tarifaRealHora: dividir(d.ingreso_cobrado, d.horas_invertidas),
    porcentajeNivel23: dividir(d.nivel_2 + d.nivel_3, totalNiveles),
    porcentajeDiseno: dividir(d.min_diseno, minTotales),
  }
}

export type Derivadas = NonNullable<ReturnType<typeof derivar>>
