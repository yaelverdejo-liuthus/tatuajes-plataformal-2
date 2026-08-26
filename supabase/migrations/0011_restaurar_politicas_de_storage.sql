-- ═══════════════════════════════════════════════════════════════════════
--  Restaurar las políticas de Storage del bucket `fotos`
--
--  De las cuatro políticas que debía tener el bucket solo quedaba la de
--  DELETE (la que agregó 0006). Las de SELECT, INSERT y UPDATE que creaba
--  0001 habían desaparecido del proyecto.
--
--  Sin política de INSERT, RLS rechaza cualquier subida — de cualquier rol,
--  admin incluido — y el cliente lo traduce como "tu rol no tiene permiso
--  de escribir aquí", que manda a buscar el problema en el lugar
--  equivocado. Las imágenes seguían VIÉNDOSE porque el bucket es público y
--  eso lo sirve el CDN sin consultar RLS, así que el síntoma aparecía solo
--  al subir.
--
--  Van con DROP IF EXISTS delante para poder recorrerla otra vez sin que
--  truene si alguna llegara a existir.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "fotos lectura"       on storage.objects;
drop policy if exists "fotos escritura"     on storage.objects;
drop policy if exists "fotos actualizacion" on storage.objects;

create policy "fotos lectura" on storage.objects for select
  to authenticated using (bucket_id = 'fotos');

create policy "fotos escritura" on storage.objects for insert
  to authenticated with check (bucket_id = 'fotos');

create policy "fotos actualizacion" on storage.objects for update
  to authenticated using (bucket_id = 'fotos') with check (bucket_id = 'fotos');


-- ── Límites del lado del servidor ─────────────────────────────────────
/*
 * El cliente ya valida tipo y tamaño antes de subir, pero esa validación
 * vive en JavaScript y se salta con cualquier llamada directa a la API.
 * El tope de verdad va aquí: 5 MB, que es lo mismo que anuncia la pantalla,
 * y solo imágenes.
 *
 * Se usa el comodín `image/*` en vez de listar subtipos: los iPhone suben
 * HEIC, algunos Android mandan el tipo vacío o raro, y una lista cerrada
 * termina rechazando fotos buenas por el formato con el que salieron del
 * celular.
 */
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/*']
where id = 'fotos';
