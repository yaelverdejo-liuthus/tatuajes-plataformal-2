import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Campo'
import { LluviaCalaveras } from '../components/LluviaCalaveras'
import { mensajeDeError } from '../lib/errores'
import { DESPLEGAR, DURACION, transicion } from '../lib/animacion'

const esquema = z.object({
  email: z.string().email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

type Formulario = z.infer<typeof esquema>

export function Login() {
  const { entrar } = useAuth()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  async function alEnviar(datos: Formulario) {
    setErrorGeneral(null)
    try {
      await entrar(datos.email, datos.password)
    } catch (e) {
      setErrorGeneral(mensajeDeError(e as { message?: string }))
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-bg px-5 py-10">
      <LluviaCalaveras />

      {/*
        Login vive fuera de AppShell, así que no hereda la transición de
        página: si no se coreografía aquí, es la única pantalla de la app
        que aparece de golpe — y es la primera que ve cualquiera.

        El escalonado va con delays explícitos y no con staggerChildren:
        cada hijo se anima por su cuenta, sin depender de que el padre
        propague la variante. Es la misma forma que ya usan Config y el
        panel de atención del tablero, y se comporta igual sin tener que
        razonar sobre cómo se heredan las variantes.
      */}
      <div className="relative z-10 mx-auto w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transicion()}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">Estudio</h1>
          <p className="mt-1.5 text-base text-fg-muted">
            Tablero de instrumentos. Sirve para decidir, no para trabajar.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transicion(), delay: 0.07 }}
          onSubmit={handleSubmit(alEnviar)}
          className="space-y-4"
        >
          <Input
            etiqueta="Correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            etiqueta="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Con salida, no solo entrada: al reintentar y volver a fallar,
              el mensaje se renueva en vez de quedarse fijo y hacer dudar si
              el segundo intento llegó a mandarse. */}
          <AnimatePresence mode="wait">
            {errorGeneral && (
              <motion.p
                key={errorGeneral}
                variants={DESPLEGAR}
                initial="oculto"
                animate="visible"
                exit="saliendo"
                transition={transicion(DURACION.rapida)}
                className="overflow-hidden rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
              >
                {errorGeneral}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" tamano="lg" bloque cargando={isSubmitting}>
            Entrar
          </Button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transicion(), delay: 0.14 }}
          className="mt-6 text-center text-sm text-fg-subtle"
        >
          Herramienta interna. El registro está cerrado — las cuentas las crea el admin.
        </motion.p>
      </div>
    </div>
  )
}
