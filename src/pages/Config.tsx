import { useState } from 'react'
import { motion } from 'framer-motion'
import { ENTRADA_ARCILLA, transicion } from '../lib/animacion'
import { Check, MessageCircle } from 'lucide-react'
import { useConfig, useGuardarConfig } from '../lib/queries/config'
import { useToast } from '../components/ui/Toast'
import { Card } from '../components/ui/Card'
import { EngranajeArcilla } from '../components/EngranajeArcilla'
import { Skeleton, ErrorCarga } from '../components/ui/Estados'
import { CLAVES_CONFIG_ORDEN, ETIQUETA_CONFIG } from '../lib/etiquetas'
import { telFormateado, urlWhatsApp } from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import type { ConfigFila } from '../lib/tipos'

/** A dónde llegan los comentarios sobre la plataforma. */
const WHATSAPP_SOPORTE = '2291628709'

/* El mensaje va precargado para que nadie tenga que pensar cómo empezar:
   quien toca el botón ya tiene la primera línea escrita y solo continúa. */
const SALUDO_SOPORTE = 'Hola, quiero contarte mi experiencia usando la plataforma: '

export function Config() {
  const { data: config, isPending, error, refetch } = useConfig()
  const guardar = useGuardarConfig()
  const toast = useToast()

  if (error) {
    return <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
  }

  // Los 7 en el orden que tiene sentido leerlos, no en orden alfabético.
  const ordenadas = CLAVES_CONFIG_ORDEN.map((c) => (config ?? []).find((f) => f.clave === c)).filter(
    (f): f is ConfigFila => Boolean(f),
  )

  return (
    <div className="space-y-4">
      {/*
        El engranaje va JUNTO al título, no encima ni de fondo.

        Es la maquinaria del sistema y el título dice de qué máquina se
        trata: separarlos convertiría la pieza en un adorno suelto. Y
        detrás del texto sería peor todavía — una silueta cruzando un
        párrafo es exactamente la decoración que le compite al contenido,
        que es lo que este rediseño vino a quitar del resto de la app.

        `shrink-0` y tamaño fijo: es un objeto, no una caja elástica. En
        móvil baja de 88 a 64 px, que sigue bastando para que el canto
        extruido se lea.
      */}
      <header className="flex items-start gap-4 sm:gap-5">
        <div className="h-16 w-16 shrink-0 sm:h-[5.5rem] sm:w-[5.5rem]">
          <EngranajeArcilla className="h-full w-full" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Ajustes
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm text-fg-muted">
            Los 7 umbrales que usa todo el sistema. Cambiarlos recalcula el filtro de contenido, el
            veredicto de pauta y los semáforos del tablero.
          </p>
        </div>
      </header>

      {isPending ? (
        // La misma rejilla que la lista real: si el esqueleto va en una
        // columna y el contenido en dos, al cargar la página se reacomoda
        // entera y parece que algo falló.
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        // Dos columnas desde lg. En una sola, el título del umbral quedaba
        // en el borde izquierdo y su campo a ochocientos píxeles a la
        // derecha: una etiqueta y su control tan lejos dejan de leerse como
        // la misma cosa, y hay que barrer la fila para saber qué se edita.
        <div data-tour="umbrales" className="grid gap-3 lg:grid-cols-2">
          {ordenadas.map((fila, i) => (
            <FilaConfig
              key={fila.clave}
              fila={fila}
              indice={i}
              onGuardar={async (valor) => {
                try {
                  await guardar.mutateAsync({ clave: fila.clave, valor })
                  toast.exito('Umbral actualizado')
                } catch (e) {
                  toast.error(mensajeDeError(e as { message?: string }))
                }
              }}
            />
          ))}
        </div>
      )}

      <p className="pt-2 text-sm text-fg-subtle">
        Estos valores son supuestos de arranque acordados en la planeación, no datos de mercado
        medidos. Reemplázalos con datos reales después de la primera semana de operación.
      </p>

      {/* ── Comentarios sobre la plataforma ──────────────────────────────
          Hasta el fondo de Ajustes a propósito: no es una tarea del día,
          es el lugar al que se llega cuando ya se anduvo por todo lo
          demás. Ajustes además es la única pantalla que no cambia con el
          trabajo diario, así que aquí no le quita el sitio a nada. */}
      <Card className="mt-2 border-primary/25 bg-primary/[0.06]">
        <p className="font-display text-lg font-semibold tracking-tight text-fg">
          ¡Cuéntanos tu experiencia en la plataforma!
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          ¿Deseas agregar algo? Lo que te estorbe, lo que te falte o lo que no se entienda — todo
          sirve.
        </p>

        <a
          href={`${urlWhatsApp(WHATSAPP_SOPORTE)}?text=${encodeURIComponent(SALUDO_SOPORTE)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-success/12 text-base font-medium text-success transition-colors hover:bg-success/20"
        >
          <MessageCircle className="gesto gesto-repicar h-5 w-5" />
          WhatsApp · {telFormateado(WHATSAPP_SOPORTE)}
        </a>
      </Card>
    </div>
  )
}

function FilaConfig({
  fila,
  indice,
  onGuardar,
}: {
  fila: ConfigFila
  indice: number
  onGuardar: (valor: number) => Promise<void>
}) {
  const [texto, setTexto] = useState(String(Number(fila.valor)))
  const [guardado, setGuardado] = useState(false)

  const valorActual = Number(fila.valor)
  const parseado = Number(texto)
  const cambiado = texto !== '' && Number.isFinite(parseado) && parseado !== valorActual

  async function confirmar() {
    if (!cambiado) {
      setTexto(String(valorActual))
      return
    }
    await onGuardar(parseado)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 1600)
  }

  return (
    <motion.div
      variants={ENTRADA_ARCILLA}
      initial="oculto"
      animate="visible"
      /*
       * El escalonado arranca en 600ms, y ese número sale de cronometrar
       * la secuencia entera contra una regla incómoda.
       *
       * El engranaje voltea en el centro hasta los 780ms y luego viaja a
       * su esquina hasta los 1500. Lo tentador sería esperarlo: las
       * tarjetas entrarían con la pieza ya colocada y todo quedaría muy
       * ordenado. Sería un error — `animate.md` es explícito en que una
       * pantalla de tipo Operate no puede hacer esperar a nadie a través
       * de una coreografía de carga, y kilómetro y medio de segundo
       * mirando un engranaje antes de poder tocar un umbral es
       * exactamente eso.
       *
       * Así que las tarjetas entran DURANTE el viaje: arrancan a los
       * 600ms y la última aterriza a los 950, mientras la pieza todavía
       * cruza la pantalla por encima. El engranaje las barre al pasar.
       *
       * Se gana por los dos lados: la lectura causal se conserva —el
       * giro trae los umbrales— y la pantalla queda usable a un segundo,
       * no a segundo y medio.
       *
       * 50ms entre tarjeta y tarjeta: dentro de los 30-80 que se sienten
       * como cascada sin que la lista se note lenta.
       */
      transition={{ ...transicion(), delay: 0.6 + Math.min(indice, 8) * 0.05 }}
    >
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-fg">
              {ETIQUETA_CONFIG[fila.clave] ?? fila.clave}
            </p>
            {/* La descripción va visible siempre: en 3 meses nadie va a
                recordar por qué el umbral es 800. */}
            <p className="mt-0.5 text-sm text-fg-muted">{fila.descripcion}</p>
            <p className="mt-1.5 font-mono text-xs text-fg-subtle">{fila.clave}</p>
          </div>

          <div className="relative w-32 shrink-0">
            <input
              type="text"
              inputMode="decimal"
              value={texto}
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={() => void confirmar()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="tabular h-11 w-full rounded-xl pozo px-3.5 text-right text-lg font-semibold text-fg transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            {guardado && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </motion.span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
