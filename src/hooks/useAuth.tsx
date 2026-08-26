import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Perfil, Rol } from '../lib/tipos'

interface AuthCtx {
  session: Session | null
  perfil: Perfil | null
  rol: Rol | null
  /** true mientras no sabemos si hay sesión */
  cargando: boolean
  /** true mientras se está trayendo el perfil de una sesión ya conocida */
  cargandoPerfil: boolean
  /** Por qué no se pudo traer el perfil. null si todo bien. */
  errorPerfil: string | null
  reintentarPerfil: () => void
  entrar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoPerfil, setCargandoPerfil] = useState(false)
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const qc = useQueryClient()

  /*
   * Efecto 1 — solo sesión.
   *
   * OJO: el callback de onAuthStateChange corre sosteniendo el lock interno
   * de auth. Si aquí adentro se llama a supabase.from(...), esa consulta pide
   * el mismo lock para resolver el token y se queda esperando para siempre:
   * deadlock, y la app se queda en la pantalla de carga sin decir nada.
   * Por eso aquí SOLO se guarda la sesión, nada de consultas.
   */
  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSession(data.session)
      setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s)
      setCargando(false)
    })

    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  /* Efecto 2 — el perfil, ya fuera del callback de auth. */
  useEffect(() => {
    const idUsuario = session?.user?.id
    if (!idUsuario) {
      setPerfil(null)
      setErrorPerfil(null)
      setCargandoPerfil(false)
      return
    }

    let vivo = true
    setCargandoPerfil(true)
    setErrorPerfil(null)

    supabase
      .from('profiles')
      .select('*')
      .eq('id', idUsuario)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return

        if (error) {
          // Nunca fallar en silencio: si no se pudo leer, hay que decirlo.
          setErrorPerfil(error.message)
          setPerfil(null)
        } else if (!data) {
          setErrorPerfil(
            'Tu cuenta existe pero no tiene perfil en la tabla profiles. ' +
              'Pídele al admin que lo cree.',
          )
          setPerfil(null)
        } else {
          setPerfil(data as Perfil)
        }
        setCargandoPerfil(false)
      })

    return () => {
      vivo = false
    }
  }, [session?.user?.id, intento])

  async function entrar(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function salir() {
    await supabase.auth.signOut()
    setPerfil(null)
    setErrorPerfil(null)
    /*
     * Sin esto, el siguiente en entrar hereda lo que quedó cacheado del
     * anterior. Con 3 personas compartiendo el mismo teléfono del estudio
     * eso se nota primero en las preferencias del tutorial, pero aplica a
     * todo: la app no recarga entre un logout y el siguiente login.
     */
    qc.clear()
  }

  return (
    <Ctx.Provider
      value={{
        session,
        perfil,
        rol: perfil?.rol ?? null,
        cargando,
        cargandoPerfil,
        errorPerfil,
        reintentarPerfil: () => setIntento((n) => n + 1),
        entrar,
        salir,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
