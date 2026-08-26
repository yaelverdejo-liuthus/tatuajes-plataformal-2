import { useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { useUmbrales } from '../lib/queries/config'
import { Badge, type Tono } from './ui/Badge'
import { Sheet } from './ui/Sheet'
import { VEREDICTO } from '../lib/etiquetas'
import { dinero } from '../lib/formato'
import { cn } from '../lib/cn'

/**
 * "Costo/conv." es el número del que cuelga todo el veredicto de Pauta, y
 * el rótulo va abreviado por falta de espacio en la pastilla. Quien no lo
 * conozca de antes no tiene de dónde deducirlo, así que se explica aquí.
 *
 * Los umbrales NO van escritos a mano: se leen de `config`, que es la misma
 * fuente que usa Postgres para calcular el veredicto. Si alguien los cambia
 * en Ajustes, esta pantalla cambia con ellos — escribirlos aquí garantizaba
 * que en un mes esta explicación estuviera mintiendo.
 */
export function ExplicacionCostoConv({ className }: { className?: string }) {
  const [abierto, setAbierto] = useState(false)
  const { umbrales } = useUmbrales()

  const bueno = umbrales.umbral_cpc_bueno
  const malo = umbrales.umbral_cpc_malo

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm text-fg-muted',
          'transition-colors hover:text-primary',
          className,
        )}
      >
        <HelpCircle className="h-4 w-4 shrink-0" />
        {'¿Cómo funciona "Costo/conv."?'}
      </button>

      <Sheet
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={'¿Cómo funciona "Costo/conv."?'}
        descripcion="Cuánto te costó cada conversación de WhatsApp que trajo la pauta."
      >
        <div className="space-y-5">
          {/* La cuenta, con números redondos. Es una división, y verla hecha
              ahorra el párrafo que la describiría. */}
          <div>
            <div className="flex items-stretch gap-2">
              <Termino titulo="Gasto" valor="$1,200" />
              <Signo>÷</Signo>
              <Termino titulo="Convs." valor="20" />
              <Signo>=</Signo>
              <Termino titulo="Costo/conv." valor="$60" destacado />
            </div>
            <p className="mt-2.5 text-sm text-fg-muted">
              Gastaste $1,200 y llegaron 20 personas a escribirte. Cada una te costó $60.
            </p>
          </div>

          <p className="text-base leading-relaxed text-fg-muted">
            Es el único número que dice si la pauta está sirviendo. Las vistas y los likes no
            se cobran; las conversaciones sí, y de ahí salen los clientes. Un creativo puede
            gastar poco y ser malísimo, o gastar mucho y ser el mejor del mes — lo que los
            separa es cuánto costó cada conversación, no cuánto se gastó.
          </p>

          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
              Qué hacer con el resultado
            </p>
            <div className="mt-2 space-y-2">
              <Regla
                veredicto="escalar"
                rango={`${dinero(bueno)} o menos`}
                explicacion="Cada conversación sale barata. Súbele el presupuesto."
              />
              <Regla
                veredicto="observar"
                rango={`Entre ${dinero(bueno)} y ${dinero(malo)}`}
                explicacion="Ni bueno ni malo. Déjalo correr un día más antes de decidir."
              />
              <Regla
                veredicto="matar"
                rango={`${dinero(malo)} o más`}
                explicacion="Cada conversación sale cara. Apágalo: el problema es el creativo."
              />
              <Regla
                veredicto="sin_datos"
                rango="Se ve un guion —"
                explicacion="Todavía no hay ni una conversación, así que no hay nada que dividir. Aún no juzgues."
              />
            </div>
          </div>

          <div className="rounded-2xl pozo p-3.5">
            <p className="text-sm leading-relaxed text-fg-muted">
              Esos dos cortes —{dinero(bueno)} y {dinero(malo)}— se cambian en{' '}
              <span className="text-fg">Ajustes</span>, y son supuestos de arranque: ajústalos
              cuando tengas datos reales tuyos. El cálculo lo hace la base de datos, no esta
              pantalla, así que el mismo número sale igual en la campaña, en el creativo y en
              el día.
            </p>
          </div>
        </div>
      </Sheet>
    </>
  )
}

function Termino({
  titulo,
  valor,
  destacado,
}: {
  titulo: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 rounded-xl px-2.5 py-2',
        destacado ? 'bg-primary/12' : 'bg-surface-2',
      )}
    >
      <span className="block truncate text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {titulo}
      </span>
      <span
        className={cn(
          'tabular font-display block truncate text-base font-semibold',
          destacado ? 'text-primary' : 'text-fg',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

function Signo({ children }: { children: ReactNode }) {
  return (
    <span className="flex shrink-0 items-center text-base font-medium text-fg-subtle">
      {children}
    </span>
  )
}

function Regla({
  veredicto,
  rango,
  explicacion,
}: {
  veredicto: keyof typeof VEREDICTO
  rango: string
  explicacion: string
}) {
  const v = VEREDICTO[veredicto]
  return (
    <div className="flex items-start gap-3 rounded-xl pozo px-3 py-2.5">
      <span className="shrink-0 pt-0.5">
        <Badge tono={v.tono as Tono} punto>
          {v.texto}
        </Badge>
      </span>
      <div className="min-w-0 flex-1">
        <p className="tabular text-sm font-medium text-fg">{rango}</p>
        <p className="mt-0.5 text-sm leading-snug text-fg-subtle">{explicacion}</p>
      </div>
    </div>
  )
}
