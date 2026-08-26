import type { Tono } from '../components/ui/Badge'
import type {
  Autoria,
  LeadEstatus,
  Nivel,
  Origen,
  Plataforma,
  PlataformaAds,
  TrabajoEstatus,
  Veredicto,
} from './tipos'

/** Nombres visibles y color de cada valor de enum. Un solo lugar. */

export const ORIGEN: Record<Origen, string> = {
  tiktok: 'TikTok',
  meta: 'Meta',
  organico: 'Orgánico',
  referido: 'Referido',
  conocido: 'Conocido',
}

export const LEAD_ESTATUS: Record<
  LeadEstatus,
  { texto: string; tono: Tono; accion: string; descripcion: string }
> = {
  nuevo: {
    texto: 'Nuevo',
    tono: 'info',
    accion: 'Regresar a nuevo',
    descripcion: 'Escribió, todavía no hay precio hablado',
  },
  cotizado: {
    texto: 'Cotizado',
    tono: 'primario',
    accion: 'Cotizar',
    descripcion: 'Ya sabe cuánto cuesta, falta cerrar',
  },
  agendado: {
    texto: 'Agendado',
    tono: 'exito',
    accion: 'Agendar',
    descripcion: 'Anticipo cobrado y fecha puesta',
  },
  perdido: {
    texto: 'Perdido',
    tono: 'neutro',
    accion: 'Marcar perdido',
    descripcion: 'Ya no va a comprar',
  },
}

/**
 * El embudo en orden. `agendado` es el final del recorrido comercial:
 * de ahí en adelante el expediente vive en Trabajos.
 */
export const EMBUDO_LEAD: LeadEstatus[] = ['nuevo', 'cotizado', 'agendado']

export const TRABAJO_ESTATUS: Record<TrabajoEstatus, { texto: string; tono: Tono }> = {
  trazado_agendado: { texto: 'Trazado agendado', tono: 'info' },
  trazado_hecho: { texto: 'Trazado hecho', tono: 'acento' },
  agendado: { texto: 'Agendado', tono: 'primario' },
  terminado: { texto: 'Terminado', tono: 'exito' },
  cancelado: { texto: 'Cancelado', tono: 'neutro' },
}

/**
 * Columnas del tablero: solo lo que sigue vivo.
 *
 * Terminado y cancelado salieron de aquí a propósito — se amontonaban para
 * siempre en una columna que nadie vuelve a mirar y empujaban el trabajo
 * del día fuera de la pantalla. Viven en la vista de Historial.
 */
export const COLUMNAS_KANBAN: TrabajoEstatus[] = [
  'trazado_agendado',
  'trazado_hecho',
  'agendado',
]

/** Lo que ya salió del taller. */
export const ESTATUS_CERRADOS: TrabajoEstatus[] = ['terminado', 'cancelado']

export const NIVEL: Record<Nivel, { texto: string; descripcion: string }> = {
  '1': { texto: 'Nivel 1', descripcion: 'Limpio con stencil' },
  '2': { texto: 'Nivel 2', descripcion: 'Florituras integradas' },
  '3': { texto: 'Nivel 3', descripcion: 'Composición original sobre anatomía' },
}

export const AUTORIA: Record<Autoria, { texto: string; tono: Tono; credito?: string }> = {
  propio: { texto: 'Propio', tono: 'primario' },
  referencia: {
    texto: 'Referencia',
    tono: 'acento',
    credito: 'Diseño de referencia, ejecución mía',
  },
  hibrido: { texto: 'Híbrido', tono: 'info' },
}

/** Dónde se PUBLICA el contenido orgánico. */
export const PLATAFORMA: Record<Plataforma, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

/** Un tono por plataforma, para diferenciarlas de un vistazo en la pestaña "Todo". */
export const PLATAFORMA_TONO: Record<Plataforma, Tono> = {
  tiktok: 'neutro',
  instagram: 'acento',
  facebook: 'info',
}

/** Dónde se COMPRA la pauta. Meta cubre Instagram y Facebook juntos. */
export const PLATAFORMA_ADS: Record<PlataformaAds, string> = {
  meta: 'Meta',
  tiktok: 'TikTok',
}

export const VEREDICTO: Record<Veredicto, { texto: string; tono: Tono; accion: string }> = {
  sin_datos: { texto: 'Sin datos', tono: 'neutro', accion: 'Todavía no hay conversaciones' },
  escalar: { texto: 'Escalar', tono: 'exito', accion: 'Sube el presupuesto de este creativo' },
  observar: { texto: 'Observar', tono: 'aviso', accion: 'Déjalo correr un día más' },
  matar: { texto: 'Matar', tono: 'peligro', accion: 'Apágalo — el problema es el creativo' },
}

/** Formatos de contenido 1–7 (§3.5 de la spec). */
export const FORMATO: Record<number, string> = {
  1: 'Limpiado final',
  2: 'Captura de WhatsApp',
  3: 'Cicatrizado 3 semanas',
  4: 'Close-up de línea',
  5: 'Timelapse de dibujo',
  6: 'Hermano explicando',
  7: 'Intención de búsqueda',
}

/** Zonas del cuerpo más usadas, para no escribirlas a mano cada vez. */
export const ZONAS = [
  'Antebrazo',
  'Brazo',
  'Mano',
  'Muñeca',
  'Hombro',
  'Espalda',
  'Pecho',
  'Costilla',
  'Pierna',
  'Tobillo',
  'Cuello',
  'Clavícula',
]

export const CLAVES_CONFIG_ORDEN = [
  'anticipo_minimo',
  'costo_insumos_pieza',
  'tarifa_objetivo_hora',
  'umbral_cpc_bueno',
  'umbral_cpc_malo',
  'filtro_vistas_4h',
  'filtro_guardados_4h',
] as const

export const ETIQUETA_CONFIG: Record<string, string> = {
  costo_insumos_pieza: 'Costo de insumos por pieza',
  umbral_cpc_bueno: 'Costo por conversación: umbral bueno',
  umbral_cpc_malo: 'Costo por conversación: umbral malo',
  filtro_vistas_4h: 'Filtro de contenido: vistas mínimas a 4 h',
  filtro_guardados_4h: 'Filtro de contenido: guardados mínimos a 4 h',
  anticipo_minimo: 'Anticipo mínimo',
  tarifa_objetivo_hora: 'Tarifa objetivo por hora',
}
