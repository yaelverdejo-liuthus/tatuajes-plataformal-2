import { supabase } from './supabase'

const BUCKET = 'fotos'

/** 5 MB. Una foto de celular ronda 2-4 MB; arriba de esto es un archivo raro. */
export const TAMANO_MAXIMO = 5 * 1024 * 1024

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/**
 * Valida antes de subir. Descubrir que el archivo no servía después de
 * esperar la subida completa, con la señal del estudio, es lo peor.
 */
export function revisarImagen(archivo: File): string | null {
  if (archivo.size > TAMANO_MAXIMO) {
    return `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB. El máximo son 5 MB.`
  }
  // Algunos Android mandan type vacío; en ese caso se deja pasar y que
  // decida el servidor, en vez de rechazar una foto buena.
  if (archivo.type && !TIPOS.includes(archivo.type)) {
    return 'Ese archivo no es una imagen. Usa JPG, PNG o WEBP.'
  }
  return null
}

const extensionDe = (archivo: File) => {
  const porNombre = archivo.name.split('.').pop()?.toLowerCase()
  if (porNombre && porNombre.length <= 5) return porNombre
  return archivo.type.split('/')[1] ?? 'jpg'
}

/**
 * Traduce los fallos de Storage sin confundirlos con los de la base.
 *
 * Un RLS de Storage y uno de una tabla dan el mismo error genérico, y el
 * traductor general lo explicaba como "tu rol no tiene permiso de escribir
 * aquí" — mandando a revisar roles cuando lo que faltaba era una política
 * del bucket. Ese diagnóstico equivocado ya costó una vuelta entera.
 */
function explicarFalloDeSubida(error: { message?: string; statusCode?: string }): string {
  const texto = error.message ?? ''

  if (texto.includes('row-level security') || error.statusCode === '403') {
    return 'El almacén de fotos rechazó la subida. No es tu rol: le faltan permisos al bucket. Avísale a quien administra Supabase.'
  }
  if (texto.includes('exceeded the maximum allowed size') || error.statusCode === '413') {
    return 'La imagen pesa más de 5 MB. Tómala de nuevo con menos resolución.'
  }
  if (texto.includes('mime type') || texto.includes('not supported')) {
    return 'Ese formato de archivo no se acepta. Usa una foto JPG, PNG o WEBP.'
  }
  if (texto.includes('Failed to fetch') || texto.includes('NetworkError')) {
    return 'Se cortó la conexión durante la subida. Vuelve a intentar con mejor señal.'
  }
  return texto || 'No se pudo subir la imagen.'
}

/**
 * Sube y devuelve la URL pública.
 *
 * El nombre lleva timestamp en vez de sobrescribir la ruta anterior: si se
 * reusara la misma, el CDN seguiría sirviendo la foto vieja por su caché y
 * parecería que la subida no funcionó.
 */
export async function subirImagen(carpeta: string, nombreBase: string, archivo: File) {
  const error = revisarImagen(archivo)
  if (error) throw new Error(error)

  const limpio = nombreBase.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40)
  const ruta = `${carpeta}/${limpio}-${Date.now()}.${extensionDe(archivo)}`

  const { error: errSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (errSubida) throw new Error(explicarFalloDeSubida(errSubida))

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
  return { url: data.publicUrl, ruta }
}

/** De una URL pública de vuelta a la ruta dentro del bucket. */
export function rutaDesdeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : url.slice(i + marca.length)
}

/**
 * Borra la imagen anterior. Se llama best-effort: si falla, el registro ya
 * apunta a la nueva y lo único que queda es un archivo huérfano — no vale
 * la pena romperle el guardado al usuario por eso.
 */
export async function borrarImagenPorUrl(url: string | null | undefined) {
  const ruta = rutaDesdeUrl(url)
  if (!ruta) return
  await supabase.storage.from(BUCKET).remove([ruta])
}
