/** @type {import('tailwindcss').Config} */
const color = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  /*
   * Que `hover:` solo aplique donde hay un cursor de verdad.
   *
   * Sin esto, Tailwind compila cada `hover:` como un `:hover` pelado, y en
   * una pantalla táctil ese estado se ACTIVA al tocar y se queda pegado
   * hasta que tocas otra cosa. Se ve como si la tarjeta que abriste hace
   * un minuto siguiera bajo el dedo. Esta línea las envuelve a todas en
   * `@media (hover: hover)`.
   *
   * Es la corrección de movimiento que más pesa en este proyecto porque es
   * un tablero que se usa en el teléfono del estudio, no en un escritorio.
   */
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        bg: color('--bg'),
        honda: color('--superficie-honda'),
        surface: color('--surface'),
        'surface-2': color('--surface-2'),
        'surface-3': color('--surface-3'),
        line: color('--border'),
        'line-strong': color('--border-strong'),
        'line-bajo': color('--border-bajo'),
        fg: color('--fg'),
        'fg-muted': color('--fg-muted'),
        'fg-subtle': color('--fg-subtle'),
        primary: color('--primary'),
        'primary-hover': color('--primary-hover'),
        'primary-fg': color('--primary-fg'),
        accent: color('--accent'),
        success: color('--success'),
        warn: color('--warn'),
        danger: color('--danger'),
        info: color('--info'),

        /*
         * Los avisos del Tablero. Únicos colores de la app que NO cambian
         * con el tema — el porqué está en estilos/arcilla.css. Se exponen
         * como paleta propia para que nadie los confunda con `danger` y
         * `warn`, que sí son del material y sí se adaptan.
         */
        aviso: {
          peligro: color('--aviso-peligro'),
          'peligro-fg': color('--aviso-peligro-fg'),
          'peligro-fg-2': color('--aviso-peligro-fg-2'),
          'peligro-hondo': color('--aviso-peligro-hondo'),
          amarillo: color('--aviso-aviso'),
          'amarillo-fg': color('--aviso-aviso-fg'),
          'amarillo-fg-2': color('--aviso-aviso-fg-2'),
          'amarillo-hondo': color('--aviso-aviso-hondo'),
        },
      },
      /*
       * Las tres voces. Ver la nota larga de src/index.css: `sans` e
       * `display` son fuentes propias auto-hospedadas, `mono` es la del
       * sistema. Detrás de cada una va la pila de siempre, que es lo que se
       * ve mientras la descarga llega — y lo único que se ve si nunca llega.
       */
      fontFamily: {
        sans: ['Inter', '"Segoe UI Variable Text"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', '"Segoe UI Variable Display"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', '"Cascadia Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.375rem', { lineHeight: '2.6rem', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '3.1rem', letterSpacing: '-0.03em' }],
      },
      spacing: { 4.5: '1.125rem', 13: '3.25rem', 18: '4.5rem', 22: '5.5rem' },
      /*
       * ── Los radios suben, y no es decoración ────────────────────────
       *
       * La arcilla no sostiene un canto vivo: una pared gruesa de material
       * blando siempre remata redondeada. Un radio chico sobre una sombra
       * de pared gruesa se lee como un error de render — la sombra promete
       * un espesor que la esquina desmiente.
       *
       * La escalera es proporcional al tamaño de la pieza, no fija, porque
       * lo que se mantiene constante en un objeto de barro es el GROSOR de
       * la pared, no el radio. Una pieza grande con el radio de una chica
       * parece cartón.
       */
      borderRadius: {
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      /*
       * La escalera de arcilla, ya montada en variables por tema. El
       * porqué de cada capa está en src/estilos/arcilla.css, que es donde
       * viven los valores.
       *
       * Estos alias existen para lo que necesita la sombra SIN la
       * superficie —un elemento que ya trae su propio color, como un botón
       * primario o una insignia de color— porque las clases `.arcilla`
       * traen las dos cosas juntas.
       */
      boxShadow: {
        arcilla: 'var(--arcilla-2)',
        'arcilla-sutil': 'var(--arcilla-1)',
        'arcilla-alta': 'var(--arcilla-3)',
        hoja: 'var(--arcilla-hoja)',
        'arcilla-color': 'var(--arcilla-color)',
        hundida: 'var(--arcilla-hundida)',
        pozo: 'var(--arcilla-pozo)',
      },
      transitionTimingFunction: {
        salida: 'var(--salida)',
        recorrido: 'var(--recorrido)',
      },
      transitionDuration: {
        toque: 'var(--t-toque)',
      },
      /*
       * El spinner gira más rápido que el 1s que trae Tailwind.
       *
       * No es un capricho: a igual tiempo de carga, un spinner rápido hace
       * que la espera se PERCIBA más corta. Es de lo poco que mejora el
       * rendimiento sentido sin tocar una sola consulta.
       */
      animation: { spin: 'spin 0.7s linear infinite' },
    },
  },
  plugins: [],
}
