# Estudio · Tablero de instrumentos

SPA privada para 3 personas que reemplaza el Google Sheet operativo del estudio de tatuajes.
No es un CRM genérico ni un sistema de reservas público: es una herramienta interna para **decidir**.

Documentos de origen: `QUE_ES_LA_PLATAFORMA.md` (el porqué), `SPEC_PLATAFORMA.md` (fuente de verdad
técnica) y `Tablero_Tatuajes_v2.xlsx` (la especificación de datos en la práctica).

El sistema visual está documentado aparte, en **[`DESIGN.md`](DESIGN.md)**. Antes de tocar
cualquier pantalla, léelo: la app entera está hecha de un solo material y hay dos o tres reglas
que no son evidentes (por qué no hay bordes de 1px, por qué `ring-*` de Tailwind rompe el
material, por qué los tintes van con `color-mix` y no con alfa).

---

## Arrancar en local

```bash
npm install
```

Copia `.env.example` a `.env.local` y llénalo:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

```bash
npm run dev
```

La anon key es **pública por diseño**. Toda la seguridad vive en las políticas RLS de Postgres.
Si RLS está mal, la base está abierta aunque escondas la llave.

---

## Estructura

```
src/
  lib/
    supabase.ts        cliente único
    tipos.ts           espejo del schema (regenerable con supabase gen types)
    formato.ts         moneda MXN, fechas, minutos→horas, y dividir() con guarda
    errores.ts         traduce constraints de Postgres a español entendible
    etiquetas.ts       nombres visibles y colores de cada enum
    csv.ts             exportación
    queries/           un archivo por entidad (TanStack Query)
    animacion.ts       vocabulario de movimiento: curvas, duraciones, resortes
  estilos/
    arcilla.css        los tokens del material, por tema
  hooks/               useAuth, useRol, useTema, useConexion, useRealtime,
                       useQuieto (para los bucles decorativos)
  components/
    ui/                Button, Campo, Card, Badge, Sheet, Estados, Toast, Segmentado
    layout/            AppShell (sidebar en desktop, bottom nav + "Más" en móvil)
    FormTrabajo.tsx    formulario compartido entre Leads y Trabajos
  pages/               Login, Dashboard, Leads, Trabajos, TrabajoDetalle,
                       Catalogo, Contenido, Ads, Config
supabase/
  migrations/          schema + RLS + vistas + seed del catálogo
  seed_ejemplo.sql     datos del Excel, solo para validar cálculos
  seed_diseno.sql      datos sintéticos con volumen, para trabajar el diseño
```

---

## Dónde viven las reglas de negocio

**En Postgres, no en React.** El frontend las explica; no las reemplaza.

| Regla | Dónde vive |
|---|---|
| No se agenda sin anticipo | `check agendado_requiere_anticipo` |
| El anticipo no excede el precio | `check anticipo_no_excede` |
| Mano siempre con retoque incluido | `check mano_requiere_retoque` |
| Saldo y minutos totales | columnas generadas `stored` |
| ¿El video pasa el filtro? | vista `v_contenido_filtro` |
| ¿Escalar o matar el creativo? | vista `v_ads_veredicto` |
| Un lead agendado tiene expediente | trigger `crear_trabajo_de_lead` |
| Borrar el expediente devuelve el lead a cotizado | trigger `lead_vuelve_a_cotizado` |
| Quién puede escribir qué | políticas RLS + `mi_rol()` |

Los 7 umbrales están en la tabla `config` y se editan desde **Ajustes** (solo admin).
Cambiarlos recalcula el filtro, el veredicto y los semáforos, porque todo lee de ahí.

Las métricas derivadas (ROAS, CAC, tasa de cierre, tarifa real/hora) se calculan en el frontend a
partir de `v_dashboard`, siempre con `dividir()`, que devuelve `null` en vez de `NaN` o `Infinity`.
Ninguna pantalla puede mostrar `NaN`.

---

## Roles

| Rol | Quién | Escribe en |
|---|---|---|
| `admin` | el dueño | todo |
| `tatuador` | el hermano | catálogo, trabajos |
| `contenido` | el primo | contenido |

Leer, leen los tres todo: son 3 personas, no hay secretos entre ellos.

---

## Desplegar en Cloudflare Pages

1. Sube el repo a GitHub.
2. Cloudflare Pages → Create project → conecta el repo.
3. Build command `npm run build`, output directory `dist`.
4. Settings → Environment variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

`public/_redirects` ya manda todas las rutas a `index.html` para que el router funcione al
recargar en una URL profunda.

---

## PWA

Manifest completo, íconos en 192/512/maskable, y service worker en `public/sw.js`.

El soporte offline es deliberadamente modesto: la app **abre** sin señal y muestra lo último
cacheado. **No hay escritura offline.** Si no hay red al guardar, sale un mensaje claro
("Sin conexión — el cambio no se guardó") y una barra ámbar permanente mientras dure la caída.
Nunca falla en silencio.

El service worker solo se registra en producción: en desarrollo cachear el shell hace que los
cambios no se vean.

---

## Comandos

```bash
npm run dev      # desarrollo
npm run build    # typecheck + build de producción
npm run preview  # servir el build
```
