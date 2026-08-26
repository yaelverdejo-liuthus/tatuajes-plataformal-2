-- ═══════════════════════════════════════════════════════════════════════
--  Tags y foto de portada para Contenido
--
--  La sección se reorganiza por plataforma en el cliente (la columna
--  `plataforma` ya existía, sin cambios de schema ahí). Lo que sí es nuevo:
--  `tags` para clasificar y filtrar videos, e `imagen_url` para la
--  miniatura de la tarjeta — mismo patrón que ya usa `catalogo.imagen_url`,
--  contra el bucket `fotos` cuyas políticas de storage.objects ya cubren
--  cualquier carpeta (0011_restaurar_politicas_de_storage.sql).
--
--  `create or replace view` solo deja AGREGAR columnas al final, nunca
--  insertarlas en medio: por eso imagen_url y tags van después de
--  pasa_filtro en el SELECT, aunque en la tabla vivan antes. Se lista cada
--  columna en vez de `c.*` para no depender del orden físico de la tabla.
-- ═══════════════════════════════════════════════════════════════════════

alter table contenido
  add column imagen_url text,
  add column tags text[] not null default '{}'::text[];

create or replace view v_contenido_filtro
with (security_invoker = on) as
select
  c.id, c.fecha, c.titulo, c.plataforma, c.formato, c.trabajo_id,
  c.precio_en_pantalla, c.vistas_4h, c.guardados_4h, c.comentarios,
  c.promocionado, c.gasto_promocion, c.created_by, c.created_at,
  (c.vistas_4h >= (select valor from config where clave='filtro_vistas_4h')
   and c.guardados_4h >= (select valor from config where clave='filtro_guardados_4h')
  ) as pasa_filtro,
  c.imagen_url, c.tags
from contenido c;
