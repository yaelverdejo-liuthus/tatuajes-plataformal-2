import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { subirImagen, borrarImagenPorUrl, revisarImagen } from '../lib/storage'
import { useToast } from './ui/Toast'
import { mensajeDeError } from '../lib/errores'
import { DURACION, FUNDIDO, transicion } from '../lib/animacion'
import { cn } from '../lib/cn'

/**
 * Subir una foto desde el celular, sin pedirle una URL a nadie.
 *
 * Antes el campo era un input de texto "Imagen (URL)": para llenarlo había
 * que subir la foto a otro lado primero y pegar el enlace. En el estudio,
 * con el cliente enfrente, eso significaba que el catálogo se quedaba sin
 * fotos.
 */
export function SubidorImagen({
  valor,
  onCambio,
  nombreBase,
  carpeta,
  etiqueta = 'Imagen',
  hint,
  deshabilitado,
}: {
  valor: string | null
  /** Recibe la URL pública nueva, o null al quitarla. */
  onCambio: (url: string | null) => void
  /** Se usa para nombrar el archivo dentro del bucket. */
  nombreBase: string
  carpeta: string
  etiqueta?: string
  hint?: string
  deshabilitado?: boolean
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const toast = useToast()

  async function procesar(archivo: File) {
    const problema = revisarImagen(archivo)
    if (problema) {
      toast.error(problema)
      return
    }

    setSubiendo(true)
    const anterior = valor
    try {
      const { url } = await subirImagen(carpeta, nombreBase || 'imagen', archivo)
      onCambio(url)
      // La vieja se va solo cuando la nueva ya está arriba y guardada.
      void borrarImagenPorUrl(anterior)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-fg-muted">{etiqueta}</span>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={deshabilitado}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void procesar(f)
          e.target.value = ''
        }}
      />

      {valor ? (
        <div className="relative overflow-hidden rounded-2xl pozo">
          {/* key en la URL: al reemplazar la foto, la nueva se funde sobre
              la anterior en vez de cambiar de golpe, que a media subida se
              confunde con un parpadeo de error. */}
          <motion.img
            key={valor}
            src={valor}
            alt=""
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={transicion()}
            className="aspect-[4/3] w-full object-cover"
          />

          <AnimatePresence>
            {subiendo && (
              <motion.div
                variants={FUNDIDO}
                initial="oculto"
                animate="visible"
                exit="saliendo"
                transition={transicion(DURACION.rapida)}
                className="absolute inset-0 flex items-center justify-center bg-black/55"
              >
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {!deshabilitado && (
            <div className="flex">
              <button
                type="button"
                disabled={subiendo}
                onClick={() => entrada.current?.click()}
                className="flex h-11 flex-1 items-center justify-center gap-2 text-sm text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Reemplazar
              </button>
              <button
                type="button"
                disabled={subiendo}
                onClick={() => {
                  void borrarImagenPorUrl(valor)
                  onCambio(null)
                }}
                className="pulsable flex h-11 w-14 items-center justify-center rounded-r-xl text-fg-subtle hover:bg-danger/15 hover:text-danger disabled:opacity-60"
                aria-label="Quitar imagen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          disabled={deshabilitado || subiendo}
          onClick={() => entrada.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastrando(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void procesar(f)
          }}
          className={cn(
            'flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl',
            'pozo [transition-property:background-color,color] duration-150 ease-salida',
            arrastrando
              ? 'bg-primary/15 text-primary'
              : 'text-fg-subtle hover:text-fg-muted',
            'disabled:opacity-60',
          )}
        >
          {subiendo ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Subiendo…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">Tomar o elegir foto</span>
              <span className="px-6 text-center text-xs">
                JPG, PNG o WEBP · hasta 5 MB
              </span>
            </>
          )}
        </motion.button>
      )}

      {hint && <p className="text-sm text-fg-subtle">{hint}</p>}
    </div>
  )
}
