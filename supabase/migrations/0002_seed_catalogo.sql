-- ═══════════════════════════════════════════════════════════════════════
--  Seed del catálogo — los diseños reales de la pestaña CATALOGO del Excel.
--
--  OJO: el line-up son 18 diseños, pero el Excel entregado solo trae 3
--  capturados. Los 15 restantes los da de alta el hermano desde la pantalla
--  de Catálogo (o se agregan aquí cuando existan).
-- ═══════════════════════════════════════════════════════════════════════

insert into catalogo
  (id, nombre, nivel, tipografia, tamano_cm, zona_recomendada, precio_base,
   autoria, retoque_incluido, tiempo_diseno_estimado_min, publicado, notas)
values
  ('N1-01', 'Manuscrita simple', '1', 'Manuscrita', '8-12', 'Antebrazo',
   900, 'propio', false, 30, true, null),

  ('N2-01', 'Script con florituras', '2', 'Manuscrita', '12-18', 'Antebrazo',
   1500, 'propio', false, 60, true, null),

  -- Mano: retoque_incluido = true por obligación del constraint mano_requiere_retoque
  ('N3-01', 'Composición gótica mano', '3', 'Gótica', 'Zona completa', 'Mano',
   3500, 'propio', true, 120, true, 'Retoque a 30 días incluido')
on conflict (id) do nothing;

comment on table catalogo is
  'Nivel: 1 = limpio con stencil · 2 = florituras integradas · '
  '3 = composición original sobre anatomía. '
  'Autoría referencia se publica con crédito: "diseño de referencia, ejecución mía".';
