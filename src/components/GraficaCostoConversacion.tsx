import { dineroExacto } from '../lib/formato'
import { cn } from '../lib/cn'

/**
 * Costo por conversación, día a día y por creativo.
 *
 * Dibujada a mano, sin librería de gráficas. Ver la nota de la mezcla de
 * niveles en Dashboard: esta era la última pantalla que arrastraba Recharts,
 * 327 kB por un gráfico de líneas.
 *
 * Lo que cambia además del aspecto: antes los umbrales eran dos rayas
 * punteadas y había que acordarse de cuál era cuál. Ahora el fondo está
 * pintado en tres FRANJAS —verde abajo, ámbar en medio, roja arriba— con
 * los mismos cortes que usa Postgres para el veredicto. La altura de un
 * punto ya dice qué hacer con ese creativo sin leer un solo número.
 *
 * La geometría va en un viewBox de 0–100 con `preserveAspectRatio="none"`,
 * que estira el dibujo al ancho que haya. Los trazos llevan
 * `vector-effect="non-scaling-stroke"` para que ese estirón no los deforme,
 * y los puntos y las etiquetas son HTML por encima: un `<circle>` en un
 * lienzo estirado saldría ovalado.
 */

const SERIES = [
  'rgb(139 109 255)',
  'rgb(224 176 128)',
  'rgb(86 168 245)',
  'rgb(63 191 127)',
]

type Fila = Record<string, string | number | null>

export function GraficaCostoConversacion({
  datos,
  nombres,
  bueno,
  malo,
}: {
  datos: Fila[]
  nombres: string[]
  bueno: number
  malo: number
}) {
  const valores = nombres.flatMap((n) =>
    datos.map((d) => d[n]).filter((v): v is number => typeof v === 'number'),
  )

  /*
   * El techo deja aire sobre el corte rojo aunque nadie lo haya alcanzado:
   * si la escala terminara en el dato más caro, la franja roja podría no
   * salir en pantalla y el aviso desaparecería justo cuando todo va bien.
   */
  const tope = Math.max(...valores, malo, 1) * 1.15

  const x = (i: number) => (datos.length <= 1 ? 50 : (i / (datos.length - 1)) * 100)
  const y = (v: number) => 100 - (v / tope) * 100

  /** Puntos con dato, en orden. Los días sin conversaciones se saltan. */
  const puntosDe = (n: string) =>
    datos
      .map((d, i) => ({ i, v: d[n] }))
      .filter((p): p is { i: number; v: number } => typeof p.v === 'number')

  const marcas = [tope, (tope * 2) / 3, tope / 3, 0]

  return (
    <div>
      {/* ── Leyenda ─────────────────────────────────────────────────── */}
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {nombres.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: SERIES[i % SERIES.length] }}
            />
            <span className="truncate">{n}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        {/* ── Escala vertical ───────────────────────────────────────── */}
        <div className="flex h-56 w-11 shrink-0 flex-col justify-between py-[1px] text-right">
          {marcas.map((m) => (
            <span key={m} className="tabular text-2xs leading-none text-fg-subtle">
              ${Math.round(m)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56 w-full overflow-hidden rounded-xl pozo">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden
            >
              <defs>
                {nombres.map((n, i) => (
                  <linearGradient key={n} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES[i % SERIES.length]} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={SERIES[i % SERIES.length]} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>

              {/* Franjas del veredicto. Arriba caro, abajo barato. */}
              <rect x="0" y="0" width="100" height={y(malo)} fill="rgb(var(--danger) / 0.10)" />
              <rect
                x="0"
                y={y(malo)}
                width="100"
                height={Math.max(y(bueno) - y(malo), 0)}
                fill="rgb(var(--warn) / 0.08)"
              />
              <rect
                x="0"
                y={y(bueno)}
                width="100"
                height={Math.max(100 - y(bueno), 0)}
                fill="rgb(var(--success) / 0.10)"
              />

              {/* Los dos cortes, marcados */}
              {[
                { v: malo, color: 'rgb(var(--danger))' },
                { v: bueno, color: 'rgb(var(--success))' },
              ].map((c) => (
                <line
                  key={c.v}
                  x1="0"
                  x2="100"
                  y1={y(c.v)}
                  y2={y(c.v)}
                  stroke={c.color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.75"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Rejilla intermedia, tenue */}
              {marcas.slice(1, -1).map((m) => (
                <line
                  key={m}
                  x1="0"
                  x2="100"
                  y1={y(m)}
                  y2={y(m)}
                  stroke="rgb(var(--border))"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Una serie por creativo: primero su relleno, luego su línea */}
              {nombres.map((n, s) => {
                const ps = puntosDe(n)
                if (ps.length === 0) return null
                const linea = ps.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')
                const retraso = `${s * 0.12}s`

                return (
                  <g key={n}>
                    {ps.length > 1 && (
                      <polygon
                        className="anim-area"
                        style={{ animationDelay: retraso }}
                        points={`${x(ps[0].i)},100 ${linea} ${x(ps[ps.length - 1].i)},100`}
                        fill={`url(#area-${s})`}
                      />
                    )}
                    <polyline
                      className="anim-trazo"
                      style={{ animationDelay: retraso }}
                      pathLength={1}
                      points={linea}
                      fill="none"
                      stroke={SERIES[s % SERIES.length]}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )
              })}
            </svg>

            {/* ── Puntos, en HTML para que salgan redondos ───────────── */}
            {nombres.map((n, s) => {
              const ps = puntosDe(n)
              const color = SERIES[s % SERIES.length]
              return ps.map((p, k) => {
                const ultimo = k === ps.length - 1
                return (
                  <span
                    key={`${n}-${p.i}`}
                    title={`${n} · ${dineroExacto(p.v)}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x(p.i)}%`, top: `${y(p.v)}%` }}
                  >
                    {/* Solo el último late: es el dato de hoy, el único que
                        todavía se puede corregir subiendo o bajando gasto. */}
                    {ultimo && (
                      <span
                        className="anim-pulso absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ background: color, animationDelay: `${s * 0.3}s` }}
                      />
                    )}
                    <span
                      className={cn(
                        'relative block rounded-full border-2 border-surface',
                        ultimo ? 'h-3 w-3' : 'h-2 w-2',
                      )}
                      style={{ background: color }}
                    />
                  </span>
                )
              })
            })}
          </div>

          {/* ── Fechas ────────────────────────────────────────────────── */}
          <div className="relative mt-1.5 h-4">
            {datos.map((d, i) => {
              // Con muchos días no caben todas: se dejan los extremos y una
              // de cada tantas, en vez de amontonarlas hasta que no se lean.
              const paso = Math.ceil(datos.length / 5)
              const visible = i === 0 || i === datos.length - 1 || i % paso === 0
              if (!visible) return null
              return (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 whitespace-nowrap text-2xs text-fg-subtle"
                  style={{
                    left: `${x(i)}%`,
                    transform:
                      i === 0
                        ? 'translateX(0)'
                        : i === datos.length - 1
                          ? 'translateX(-100%)'
                          : undefined,
                  }}
                >
                  {String(d.fecha)}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
