/** Exportar a CSV. Excel en español espera ; como separador y BOM para acentos. */

function escapar(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function descargarCSV(nombre: string, filas: Record<string, unknown>[]) {
  if (filas.length === 0) return

  const columnas = Object.keys(filas[0])
  const lineas = [
    columnas.join(';'),
    ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(';')),
  ]

  // BOM: sin esto Excel abre los acentos como caracteres raros.
  const blob = new Blob(['﻿' + lineas.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
