import { useCallback, useEffect, useState } from 'react'

export type Tema = 'dark' | 'light'
const LLAVE = 'tatuajes:tema'

/** Oscuro por defecto: la app se usa de noche, en el estudio, con poca luz. */
function temaInicial(): Tema {
  const guardado = localStorage.getItem(LLAVE)
  if (guardado === 'dark' || guardado === 'light') return guardado
  return 'dark'
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.remove('dark', 'light')
    raiz.classList.add(tema)
    localStorage.setItem(LLAVE, tema)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', tema === 'dark' ? '#0b0b0e' : '#fafafb')
  }, [tema])

  const alternar = useCallback(() => setTema((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return { tema, setTema, alternar }
}
