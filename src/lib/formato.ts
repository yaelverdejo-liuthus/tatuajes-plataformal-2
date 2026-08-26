/** Formato consistente en toda la app. Un solo lugar, una sola verdad. */

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

const mxnCentavos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
})

export const dinero = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : mxn.format(n)

export const dineroExacto = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : mxnCentavos.format(n)

export const numero = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('es-MX').format(n)

export const porcentaje = (n: number | null | undefined, decimales = 0) =>
  n == null || !Number.isFinite(n)
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'percent',
        maximumFractionDigits: decimales,
      }).format(n)

/** Multiplicador tipo ROAS: 2.4x */
export const multiplo = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(1)}x`

/**
 * Cuenta con su sustantivo concordado: `plural(1, 'campaña activa',
 * 'campañas activas')` → "1 campaña activa".
 *
 * Existía el bug en cinco encabezados —"1 campañas activas", "1 activos",
 * "1 diseños"— y son justo las líneas que resumen la pantalla, lo primero
 * que se lee. Con un estudio chico el 1 es el caso de todos los días, no
 * el borde raro.
 *
 * El plural va explícito y no derivado con una regla: en español la regla
 * tiene demasiadas excepciones (mes/meses, lápiz/lápices) y el segundo
 * argumento cuesta menos que descubrir cuál se rompió.
 */
export const plural = (n: number, singular: string, plural: string) =>
  `${numero(n)} ${n === 1 ? singular : plural}`

/** minutos → "2 h 30 min" */
export function minutosAHoras(min: number | null | undefined) {
  if (min == null || !Number.isFinite(min)) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

export const horas = (h: number | null | undefined) =>
  h == null || !Number.isFinite(h) ? '—' : `${h.toFixed(1)} h`

/**
 * División con guarda. Devuelve null en vez de NaN o Infinity.
 * Ninguna pantalla debe poder mostrar NaN — ver §10 de la spec.
 */
export function dividir(numerador: number | null | undefined, denominador: number | null | undefined) {
  if (numerador == null || denominador == null) return null
  if (!Number.isFinite(numerador) || !Number.isFinite(denominador)) return null
  if (denominador === 0) return null
  const r = numerador / denominador
  return Number.isFinite(r) ? r : null
}

const diasSemana = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'YYYY-MM-DD' → Date local, sin corrimiento de zona horaria. */
export function aFechaLocal(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** '2026-08-22' → 'sáb 22 ago' */
export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return '—'
  const f = aFechaLocal(iso.slice(0, 10))
  return `${diasSemana[f.getDay()]} ${f.getDate()} ${meses[f.getMonth()]}`
}

/** '2026-08-22' → '22 de agosto de 2026' */
export function fechaLarga(iso: string | null | undefined) {
  if (!iso) return '—'
  return aFechaLocal(iso.slice(0, 10)).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** '16:00:00' → '4:00 p.m.' */
export function hora12(t: string | null | undefined) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const suf = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suf}`
}

export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Días de diferencia contra hoy. Negativo = ya pasó. */
export function diasDesdeHoy(iso: string | null | undefined) {
  if (!iso) return null
  const hoy = aFechaLocal(hoyISO())
  const f = aFechaLocal(iso.slice(0, 10))
  return Math.round((f.getTime() - hoy.getTime()) / 86_400_000)
}

/**
 * Distancia en lenguaje de taller: "Hoy", "Mañana", "En 3 días", "Hace 2 días".
 * Es lo que se lee de reojo entre cliente y cliente; una fecha exacta obliga
 * a hacer la cuenta mental.
 */
export function cuandoTexto(iso: string | null | undefined) {
  const d = diasDesdeHoy(iso)
  if (d == null) return 'Sin fecha'
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  if (d === -1) return 'Ayer'
  return d > 0 ? `En ${d} días` : `Hace ${Math.abs(d)} días`
}

/** '3141234567' → 'https://wa.me/523141234567' */
export function urlWhatsApp(numeroTel: string) {
  const limpio = numeroTel.replace(/\D/g, '')
  const conLada = limpio.startsWith('52') ? limpio : `52${limpio}`
  return `https://wa.me/${conLada}`
}

export const telFormateado = (t: string) => {
  const d = t.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : t
}
