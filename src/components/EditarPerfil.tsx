import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ui/Toast'
import { Button } from './ui/Button'
import { Input } from './ui/Campo'
import { Sheet } from './ui/Sheet'
import { SubidorImagen } from './SubidorImagen'
import { ConfirmarBorrado } from './ConfirmarBorrado'
import { borrarImagenPorUrl } from '../lib/storage'
import { NOMBRE_ROL } from '../hooks/useRol'
import { mensajeDeError } from '../lib/errores'

/**
 * Editar perfil: foto, nombre y el botón de vaciar la plataforma.
 *
 * El rol no se edita aquí y no es un olvido — lo fija un trigger en la base
 * (0013). Si el rol se pudiera cambiar desde el propio perfil, cualquiera se
 * pondría 'admin' y se abriría Leads, Pauta y Ajustes solo.
 */
export function EditarPerfil({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { perfil, rol, reintentarPerfil } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [nombre, setNombre] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarVaciado, setConfirmarVaciado] = useState(false)

  // Al abrir se recarga lo que hay guardado: si alguien editó desde otro
  // dispositivo, el formulario no debe partir de un valor viejo.
  useEffect(() => {
    if (!abierto) return
    setNombre(perfil?.nombre ?? '')
    setAvatar(perfil?.avatar_url ?? null)
  }, [abierto, perfil?.nombre, perfil?.avatar_url])

  const limpio = nombre.trim()
  const cambiado = limpio !== (perfil?.nombre ?? '') || avatar !== (perfil?.avatar_url ?? null)

  async function guardar() {
    if (!perfil) return
    if (!limpio) {
      toast.error('El nombre no puede quedar vacío.')
      return
    }

    setGuardando(true)
    try {
      const anterior = perfil.avatar_url
      const { error } = await supabase
        .from('profiles')
        .update({ nombre: limpio, avatar_url: avatar })
        .eq('id', perfil.id)
      if (error) throw error

      // La foto vieja se va solo cuando la nueva ya quedó guardada.
      if (anterior && anterior !== avatar) void borrarImagenPorUrl(anterior)

      reintentarPerfil()
      toast.exito('Perfil actualizado')
      onCerrar()
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    } finally {
      setGuardando(false)
    }
  }

  async function vaciar() {
    try {
      const { error } = await supabase.rpc('vaciar_datos_operativos')
      if (error) throw error

      // Todo lo cacheado quedó obsoleto de golpe: se tira entero en vez de
      // invalidar tabla por tabla y arriesgar que algo se quede colgado.
      qc.clear()
      setConfirmarVaciado(false)
      onCerrar()
      toast.exito('Listo. La plataforma quedó en ceros.')
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
      throw e
    }
  }

  return (
    <>
      <Sheet
        abierto={abierto}
        onCerrar={onCerrar}
        titulo="Editar perfil"
        descripcion={rol ? `Entraste como ${NOMBRE_ROL[rol]}.` : undefined}
        pie={
          <Button
            bloque
            tamano="lg"
            cargando={guardando}
            disabled={!cambiado}
            onClick={() => void guardar()}
          >
            {cambiado ? 'Guardar cambios' : 'Sin cambios que guardar'}
          </Button>
        }
      >
        <div className="space-y-4">
          <SubidorImagen
            valor={avatar}
            onCambio={setAvatar}
            carpeta="perfiles"
            nombreBase={limpio || 'perfil'}
            etiqueta="Foto de perfil"
            hint="Se ve en el menú, junto a tu nombre."
          />

          <Input
            etiqueta="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Cómo quieres que te llame la app"
          />

          {/* El rol se muestra pero no se edita: que se vea de dónde salen
              los permisos evita la pregunta de "por qué no me deja". */}
          <div className="rounded-2xl pozo px-3.5 py-3">
            <p className="text-sm font-medium text-fg-muted">Rol</p>
            <p className="mt-0.5 text-base text-fg">{rol ? NOMBRE_ROL[rol] : '—'}</p>
            <p className="mt-1 text-sm text-fg-subtle">
              Define qué puedes editar. Lo cambia quien administra la base, no se edita desde aquí.
            </p>
          </div>

          {/* ── Zona de peligro ──────────────────────────────────────────
              Va al fondo y separada: nadie llega aquí por accidente
              buscando cambiarse la foto. */}
          <div className="!mt-7 rounded-2xl border border-danger/30 bg-danger/8 p-3.5">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-danger" />
              <div className="min-w-0">
                <p className="text-base font-medium text-danger">Vaciar datos de la plataforma</p>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                  Borra <span className="text-fg">todos</span> los leads, trabajos, videos,
                  campañas, creativos y capturas de pauta. El tablero vuelve a ceros y el
                  historial del estudio se pierde.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                  Se conservan tu catálogo de diseños, los 7 umbrales de Ajustes y las cuentas
                  del equipo.
                </p>
                <p className="mt-2 text-sm font-medium text-danger">
                  No hay deshacer y no hay respaldo. Si tienes dudas, exporta antes los CSV de
                  cada sección.
                </p>
              </div>
            </div>

            <Button
              variante="peligro"
              bloque
              className="mt-3.5"
              onClick={() => setConfirmarVaciado(true)}
            >
              Vaciar datos de la plataforma
            </Button>
          </div>
        </div>
      </Sheet>

      {/* El último filtro, por si el botón se tocó sin querer. */}
      <ConfirmarBorrado
        abierto={confirmarVaciado}
        onCerrar={() => setConfirmarVaciado(false)}
        onConfirmar={vaciar}
        titulo="¿Seguro que quieres vaciar los datos de la plataforma?"
        etiqueta="Sí, vaciar todo"
        descripcion={
          <>
            Se borran leads, trabajos, videos, campañas, creativos y capturas de pauta.{' '}
            <span className="text-fg">Esto no se puede deshacer.</span> Tu catálogo, los umbrales
            y las cuentas se quedan.
          </>
        }
      />
    </>
  )
}
