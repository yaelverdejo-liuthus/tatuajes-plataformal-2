import { useAuth } from './useAuth'
import type { Rol } from '../lib/tipos'

/**
 * Permisos de escritura, espejo de las políticas RLS de §4 de la spec.
 *
 * OJO: esto NO es seguridad. La seguridad la aplica Postgres vía RLS.
 * Esto solo evita mostrarle a alguien un botón que la base le va a rechazar
 * — esconder un botón no protege nada.
 */
const ESCRITURA: Record<string, Rol[]> = {
  // Material compartido del estudio: quien hace el contenido es quien tiene
  // las fotos buenas a la mano, así que también lo edita.
  catalogo: ['admin', 'tatuador', 'contenido'],
  leads: ['admin'],
  trabajos: ['admin', 'tatuador'],
  contenido: ['admin', 'contenido'],
  ads: ['admin'],
  config: ['admin'],
}

export type Entidad = keyof typeof ESCRITURA

export function useRol() {
  const { rol } = useAuth()

  return {
    rol,
    esAdmin: rol === 'admin',
    esTatuador: rol === 'tatuador',
    esContenido: rol === 'contenido',
    /** ¿este rol puede escribir en esta tabla? */
    puedeEscribir: (entidad: Entidad) => (rol ? ESCRITURA[entidad].includes(rol) : false),
  }
}

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: 'Admin',
  tatuador: 'Tatuador',
  contenido: 'Contenido',
}
