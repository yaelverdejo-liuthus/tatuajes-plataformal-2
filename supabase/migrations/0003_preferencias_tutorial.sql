-- Preferencias por usuario (tutorial de bienvenida).
--
-- Va en tabla aparte y NO como columna de profiles a propósito: para que
-- alguien pueda guardar su propia preferencia haría falta una política de
-- update sobre su fila de profiles, y esa misma política le dejaría
-- cambiarse el rol a 'admin'. Aquí no hay rol que escalar.

create table preferencias (
  id uuid primary key references profiles(id) on delete cascade,
  mostrar_tutorial boolean not null default true,
  tutorial_visto_en timestamptz,
  updated_at timestamptz default now()
);

alter table preferencias enable row level security;

create policy "lee lo suyo" on preferencias for select to authenticated
  using (id = auth.uid());

create policy "crea lo suyo" on preferencias for insert to authenticated
  with check (id = auth.uid());

create policy "actualiza lo suyo" on preferencias for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create trigger preferencias_touch before update on preferencias
  for each row execute function touch_updated_at();
