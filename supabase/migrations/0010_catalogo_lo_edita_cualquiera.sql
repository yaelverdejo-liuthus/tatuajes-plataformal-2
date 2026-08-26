-- ═══════════════════════════════════════════════════════════════════════
--  El catálogo lo edita cualquiera del equipo
--
--  Estaba restringido a admin y tatuador. En un estudio de tres personas
--  el catálogo es material compartido —fotos, precios, zonas— y quien está
--  haciendo el contenido es justo quien tiene las fotos buenas a la mano.
--  Dejarlo fuera obligaba a pedirle a otro que subiera la imagen.
--
--  Se listan los tres roles en vez de poner `true`: así un usuario
--  autenticado SIN perfil sigue sin poder escribir. mi_rol() devuelve null
--  para él, y `null in (...)` es null, o sea falso.
-- ═══════════════════════════════════════════════════════════════════════

alter policy "escribe catalogo" on catalogo
  using      (mi_rol() in ('admin', 'tatuador', 'contenido'))
  with check (mi_rol() in ('admin', 'tatuador', 'contenido'));
