-- ═══════════════════════════════════════════════════════════════════════
--  Arreglar el botón de vaciar la plataforma
--
--  Fallaba con "DELETE requires a WHERE clause" y nunca llegó a borrar
--  nada. La causa no está en la función sino en cómo se conecta PostgREST:
--
--    authenticator → session_preload_libraries = supautils, safeupdate
--
--  `safeupdate` es la red de seguridad de Supabase contra el clásico
--  `delete from tabla` escrito sin querer en una consola. Va precargada en
--  la sesión, así que vigila TODAS las sentencias que pasen por ella —
--  incluidas las de dentro de una función SECURITY DEFINER, que es donde
--  vivían estos siete borrados. La función no se saltaba la regla por ser
--  privilegiada: corría en la misma sesión vigilada.
--
--  El atajo que suele recomendarse es `where true`, y NO funciona: el
--  planificador lo pliega y el plan queda sin filtro, idéntico al borrado
--  pelado. Comprobado con EXPLAIN sobre esta misma base:
--
--    explain delete from ads where true;
--      Delete on ads
--        ->  Seq Scan on ads          ← sin línea de Filter
--
--  Lo mismo pasa con `where id is not null`, porque `id` es NOT NULL y el
--  planificador lo sabe. Solo sobrevive un centinela del tipo
--  `id <> '00000000-...'`, y eso deja un hueco: la fila que por
--  casualidad tuviera ese id no se borraría.
--
--  Así que no se busca un filtro que engañe al candado: se usa la
--  sentencia correcta. Vaciar una tabla entera es TRUNCATE, no DELETE, y
--  TRUNCATE ni siquiera entra en lo que `safeupdate` vigila.
--
--  Se comprobó antes de cambiarlo:
--
--  · El grafo de llaves foráneas está CERRADO — todo lo que apunta a estas
--    siete es una de las siete. Por eso van todas en una sola sentencia y
--    sin CASCADE: no hay forma de que el borrado alcance al catálogo, a
--    los umbrales de config ni a las cuentas.
--  · Ninguna de las siete tiene trigger de DELETE (los que hay son de
--    INSERT y UPDATE). TRUNCATE no dispara triggers de fila, así que aquí
--    se comporta igual que el DELETE que reemplaza.
--  · No hay secuencias propias de estas tablas, así que no hace falta
--    RESTART IDENTITY.
--
--  De paso resuelve un problema que todavía no había dado la cara: el rol
--  `authenticator` tiene `statement_timeout = 8s`. Siete borrados fila por
--  fila con sus verificaciones de FK habrían acabado chocando contra ese
--  techo al crecer el historial. TRUNCATE no recorre filas.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function vaciar_datos_operativos() returns void
language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() is null then
    raise exception 'Necesitas un perfil del equipo para vaciar los datos.';
  end if;

  -- Las siete juntas en una sentencia: TRUNCATE exige que estén todas las
  -- que se referencian entre sí, o falla pidiendo CASCADE. Listarlas es
  -- justo lo que hace innecesario el CASCADE, y con él el riesgo de que
  -- el borrado se propague a una tabla que nadie quería vaciar.
  truncate table
    ads,
    creativos,
    campanas,
    contenido,
    reprogramaciones,
    trabajos,
    leads;
end $$;

revoke all on function vaciar_datos_operativos() from public;
grant execute on function vaciar_datos_operativos() to authenticated;
