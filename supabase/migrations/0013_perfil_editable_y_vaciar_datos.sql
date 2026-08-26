-- ═══════════════════════════════════════════════════════════════════════
--  Editar perfil, y el botón de vaciar la plataforma
--
--  `profiles` solo tenía política de SELECT: RLS rechazaba en silencio
--  cualquier intento de cambiar el nombre. Aquí se abre esa puerta, pero
--  bien angosta — por ella solo pasan el nombre y la foto.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Foto de perfil ─────────────────────────────────────────────────
alter table profiles add column avatar_url text;


-- ── 2. Cada quien edita SU perfil ─────────────────────────────────────
create policy "edita su propio perfil" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

/*
 * El rol NO se toca por esta vía.
 *
 * Sin este candado, la política de arriba alcanzaba para que cualquiera se
 * pusiera 'admin' desde su propio perfil y se saltara TODAS las políticas
 * de escritura de la plataforma — Leads, Pauta y Ajustes son de admin, y
 * ese permiso se lo estaría dando el interesado a sí mismo.
 *
 * Se fijan también id y created_at: no hay razón para que un formulario de
 * perfil los mueva, y dejarlos abiertos solo da superficie.
 *
 * Los cambios de rol siguen siendo tarea de quien administra Supabase, que
 * es como han sido siempre — no existe pantalla para eso.
 */
create or replace function profiles_solo_nombre_y_foto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.rol := old.rol;
  new.created_at := old.created_at;
  return new;
end $$;

create trigger profiles_solo_nombre_y_foto
  before update on profiles
  for each row execute function profiles_solo_nombre_y_foto();


-- ── 3. Vaciar los datos operativos ────────────────────────────────────
/*
 * Deja el tablero en ceros SIN tocar el catálogo de diseños, los umbrales
 * de `config` ni las cuentas. Eso no es historial de operación: es la
 * configuración con la que la plataforma sabe trabajar, y rehacer la lista
 * de precios a mano sería el castigo por querer empezar limpio.
 *
 * El orden respeta las llaves foráneas que NO son cascade: `contenido`
 * apunta a `trabajos`, y `trabajos` apunta a `leads`. Los hijos primero.
 *
 * Va en SECURITY DEFINER porque borra siete tablas de un golpe y no tiene
 * caso repetir el permiso en cada una. El candado es tener perfil del
 * equipo — `mi_rol()` devuelve null para un autenticado sin fila en
 * profiles, y ese no borra nada.
 */
create or replace function vaciar_datos_operativos() returns void
language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() is null then
    raise exception 'Necesitas un perfil del equipo para vaciar los datos.';
  end if;

  delete from ads;
  delete from creativos;
  delete from campanas;
  delete from contenido;
  delete from reprogramaciones;
  delete from trabajos;
  delete from leads;
end $$;

revoke all on function vaciar_datos_operativos() from public;
grant execute on function vaciar_datos_operativos() to authenticated;
