import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Sin esto, cualquier error de render desmonta el árbol entero y la app se
 * queda como un <div id="root"> vacío: fondo negro y nada que tocar, sin
 * una sola pista de qué pasó. Nunca fallar en silencio.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-dvh bg-bg px-5 py-10 text-fg">
        <div className="mx-auto w-full max-w-lg">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Se rompió algo</h1>
          <p className="mt-2 text-base text-fg-muted">
            La pantalla no se pudo dibujar. Esto es un error de la app, no algo que hayas
            hecho mal.
          </p>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-danger/25 bg-danger/8 p-3.5 text-sm text-danger">
            {error.message}
          </pre>

          {error.stack && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-fg-subtle">
                Detalle técnico
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-3.5 text-xs text-fg-muted">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="h-12 flex-1 rounded-xl bg-primary text-base font-medium text-primary-fg"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-12 flex-1 rounded-xl pozo text-base font-medium text-fg"
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
