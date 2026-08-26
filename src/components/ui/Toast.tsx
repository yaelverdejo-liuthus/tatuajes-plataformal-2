import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import { SALIDA } from '../../lib/animacion'
import { cn } from '../../lib/cn'

type Tipo = 'exito' | 'error' | 'info' | 'regla'

interface Aviso {
  id: number
  tipo: Tipo
  texto: string
}

const Ctx = createContext<{
  exito: (t: string) => void
  error: (t: string) => void
  info: (t: string) => void
  /** Regla de negocio bloqueada por la base: se muestra más tiempo y con otro tono. */
  regla: (t: string) => void
} | null>(null)

const ESTILOS: Record<Tipo, { clase: string; icono: ReactNode }> = {
  exito: {
    clase: 'text-success ring-1 ring-inset ring-success/25',
    icono: <CheckCircle2 className="h-5 w-5 shrink-0" />,
  },
  error: {
    clase: 'text-danger ring-1 ring-inset ring-danger/25',
    icono: <AlertTriangle className="h-5 w-5 shrink-0" />,
  },
  info: {
    clase: 'text-info ring-1 ring-inset ring-info/25',
    icono: <Info className="h-5 w-5 shrink-0" />,
  },
  regla: {
    clase: 'text-warn ring-1 ring-inset ring-warn/25',
    icono: <ShieldAlert className="h-5 w-5 shrink-0" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const empujar = useCallback((tipo: Tipo, texto: string) => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, tipo, texto }])
    const ms = tipo === 'regla' ? 6500 : tipo === 'error' ? 5000 : 3000
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), ms)
  }, [])

  const api = useMemo(
    () => ({
      exito: (t: string) => empujar('exito', t),
      error: (t: string) => empujar('error', t),
      info: (t: string) => empujar('info', t),
      regla: (t: string) => empujar('regla', t),
    }),
    [empujar],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <AnimatePresence initial={false}>
          {avisos.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              /* La salida más rápida que la entrada. Entrar es el sistema
                 presentándose y merece los 200ms; salir es quitarse de en
                 medio, y ahí la lentitud solo estorba. Un aviso que tarda
                 lo mismo en irse que en llegar se siente pegajoso. */
              exit={{
                opacity: 0,
                y: -12,
                scale: 0.97,
                transition: { duration: 0.15, ease: SALIDA },
              }}
              transition={{ duration: 0.2, ease: SALIDA }}
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3.5',
                /*
                 * El aviso es la pieza que MÁS flota de toda la app:
                 * aparece por encima de todo, incluidas las hojas. Por eso
                 * lleva `arcilla-alta`, el peldaño de proyección más larga
                 * — es lo que lo despega del contenido en vez de dejarlo
                 * apoyado sobre él.
                 *
                 * El fondo va sólido y no translúcido. Con `bg-surface/95`
                 * más `backdrop-blur` se veía bien sobre contenido quieto y
                 * fatal sobre una lista con scroll: el desenfoque arrastra
                 * lo de abajo y el texto del aviso queda nadando. Un aviso
                 * tiene que poder leerse de un vistazo mientras algo se
                 * mueve detrás, que es exactamente cuándo aparece.
                 */
                'bg-surface shadow-arcilla-alta',
                ESTILOS[a.tipo].clase,
              )}
            >
              {ESTILOS[a.tipo].icono}
              <p className="text-sm leading-snug">{a.texto}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
