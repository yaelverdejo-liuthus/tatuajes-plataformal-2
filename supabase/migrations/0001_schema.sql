-- ═══════════════════════════════════════════════════════════════════════
--  Plataforma de gestión — estudio de tatuajes
--  Schema completo: tablas, constraints, columnas generadas, vistas y RLS.
--
--  Traducción literal de §3 y §4 de SPEC_PLATAFORMA.md.
--  Las reglas de negocio viven AQUÍ, no en React.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Perfiles y roles ───────────────────────────────────────────────

create type user_role as enum ('admin', 'tatuador', 'contenido');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  rol user_role not null default 'contenido',
  created_at timestamptz default now()
);

-- Crear perfil automáticamente al registrarse.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'contenido');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Mantener updated_at sin depender de que el cliente lo mande.
create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;


-- ── 2. Catálogo ───────────────────────────────────────────────────────

create type nivel_diseno as enum ('1', '2', '3');
create type autoria_tipo as enum ('propio', 'referencia', 'hibrido');

create table catalogo (
  id text primary key,                    -- 'N1-01', 'N3-02'
  nombre text not null,
  nivel nivel_diseno not null,
  tipografia text,
  tamano_cm text,
  zona_recomendada text,
  precio_base numeric(10,2) not null check (precio_base > 0),
  autoria autoria_tipo not null default 'propio',
  retoque_incluido boolean not null default false,
  tiempo_diseno_estimado_min int,
  publicado boolean not null default false,
  imagen_url text,
  notas text,
  created_at timestamptz default now()
);

-- Regla de negocio: mano SIEMPRE con retoque incluido.
-- La zona retiene mal la tinta; si el retoque no está en el precio, se regala.
alter table catalogo add constraint mano_requiere_retoque
  check (zona_recomendada is distinct from 'Mano' or retoque_incluido = true);


-- ── 3. Leads ──────────────────────────────────────────────────────────

create type lead_estatus as enum
  ('nuevo','cotizado','trazado_agendado','anticipo_pagado','agendado','perdido');
create type origen_tipo as enum ('tiktok','meta','organico','referido','conocido');

create table leads (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  nombre text not null,
  whatsapp text not null,
  origen origen_tipo not null,
  que_pidio text,
  nivel_estimado nivel_diseno,
  estatus lead_estatus not null default 'nuevo',
  siguiente_accion text,
  fecha_seguimiento date,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index leads_seguimiento_idx on leads (fecha_seguimiento)
  where estatus not in ('agendado','perdido');

create trigger leads_touch before update on leads
  for each row execute function touch_updated_at();


-- ── 4. Trabajos ───────────────────────────────────────────────────────

create type trabajo_estatus as enum
  ('trazado_agendado','trazado_hecho','agendado','terminado','cancelado');

create table trabajos (
  id text primary key,                    -- 'T-001'
  lead_id uuid references leads(id),
  cliente text not null,
  whatsapp text not null,
  diseno text not null,
  catalogo_id text references catalogo(id),
  nivel nivel_diseno not null,
  zona text not null,
  fecha_trazado date,
  fecha_tatuaje date,
  hora time,
  precio_total numeric(10,2) not null check (precio_total > 0),
  anticipo numeric(10,2) not null default 0 check (anticipo >= 0),
  tiempo_diseno_min int check (tiempo_diseno_min >= 0),
  tiempo_aplicacion_min int check (tiempo_aplicacion_min >= 0),
  estatus trabajo_estatus not null default 'trazado_agendado',
  origen origen_tipo not null,
  retoque_pendiente boolean not null default false,
  foto_zona_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint anticipo_no_excede check (anticipo <= precio_total),

  -- REGLA CRÍTICA: no se agenda sesión de tatuaje sin anticipo.
  -- Un martes a las 9 de la noche, cansado, esta línea es la que aguanta.
  constraint agendado_requiere_anticipo check (
    estatus not in ('agendado','terminado') or anticipo > 0
  )
);

-- Campos derivados: calculados en la base, nunca en el cliente.
-- Si el saldo se calcula en React, dos pantallas muestran números distintos
-- y nadie sabe cuál es el bueno.
alter table trabajos
  add column saldo numeric(10,2)
    generated always as (precio_total - anticipo) stored,
  add column minutos_totales int
    generated always as (
      coalesce(tiempo_diseno_min,0) + coalesce(tiempo_aplicacion_min,0)
    ) stored;

create index trabajos_estatus_idx on trabajos (estatus);
create index trabajos_fecha_tatuaje_idx on trabajos (fecha_tatuaje);

create trigger trabajos_touch before update on trabajos
  for each row execute function touch_updated_at();


-- ── 5. Contenido ──────────────────────────────────────────────────────

create type plataforma_tipo as enum ('tiktok','instagram','facebook');

create table contenido (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  titulo text not null,
  plataforma plataforma_tipo not null,
  formato int not null check (formato between 1 and 7),
  trabajo_id text references trabajos(id),
  precio_en_pantalla boolean not null default false,
  vistas_4h int check (vistas_4h >= 0),
  guardados_4h int check (guardados_4h >= 0),
  comentarios int check (comentarios >= 0),
  promocionado boolean not null default false,
  gasto_promocion numeric(10,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index contenido_fecha_idx on contenido (fecha desc);

comment on column contenido.formato is
  '1 Limpiado final · 2 Captura de WhatsApp · 3 Cicatrizado 3 semanas · '
  '4 Close-up de línea · 5 Timelapse de dibujo · 6 Hermano explicando · '
  '7 Intención de búsqueda';


-- ── 6. Ads y configuración ────────────────────────────────────────────

create table ads (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  plataforma plataforma_tipo not null,
  creativo text not null,
  objetivo text not null,
  presupuesto numeric(10,2) not null,
  gasto_real numeric(10,2) not null default 0,
  conversaciones int not null default 0 check (conversaciones >= 0),
  created_at timestamptz default now()
);

create index ads_fecha_idx on ads (fecha desc);

create table config (
  clave text primary key,
  valor numeric not null,
  descripcion text
);

insert into config (clave, valor, descripcion) values
  ('costo_insumos_pieza', 140, 'Cartucho, tinta, guantes, film, stencil, apósito, aftercare'),
  ('umbral_cpc_bueno', 40, 'Debajo de esto, escalar el creativo'),
  ('umbral_cpc_malo', 80, 'Arriba de esto, matar el creativo'),
  ('filtro_vistas_4h', 800, 'Vistas mínimas para merecer promoción'),
  ('filtro_guardados_4h', 15, 'Guardados mínimos para merecer promoción'),
  ('anticipo_minimo', 200, 'Sin anticipo no hay cita'),
  ('tarifa_objetivo_hora', 400, 'Piso de sostenibilidad incluyendo diseño');


-- ── 7. Vistas derivadas ───────────────────────────────────────────────
-- security_invoker: la vista respeta el RLS del que consulta, no el del dueño.

create or replace view v_contenido_filtro
with (security_invoker = on) as
select c.*,
  (c.vistas_4h >= (select valor from config where clave='filtro_vistas_4h')
   and c.guardados_4h >= (select valor from config where clave='filtro_guardados_4h')
  ) as pasa_filtro
from contenido c;

create or replace view v_ads_veredicto
with (security_invoker = on) as
select a.*,
  case when a.conversaciones = 0 then null
       else a.gasto_real / a.conversaciones end as costo_por_conversacion,
  case
    when a.conversaciones = 0 then 'sin_datos'
    when a.gasto_real / a.conversaciones
         <= (select valor from config where clave='umbral_cpc_bueno') then 'escalar'
    when a.gasto_real / a.conversaciones
         >= (select valor from config where clave='umbral_cpc_malo') then 'matar'
    else 'observar'
  end as veredicto
from ads a;

create or replace view v_dashboard
with (security_invoker = on) as
with t as (select * from trabajos where estatus <> 'cancelado')
select
  -- Terminado aporta precio completo; pendiente solo el anticipo cobrado
  coalesce((select sum(precio_total) from t where estatus='terminado'),0)
    + coalesce((select sum(anticipo) from t where estatus<>'terminado'),0) as ingreso_cobrado,
  (select count(*) from t where estatus='terminado')
    * (select valor from config where clave='costo_insumos_pieza')       as costo_insumos,
  coalesce((select sum(gasto_real) from ads),0)                          as gasto_pauta,
  (select count(*) from leads)                                          as conversaciones,
  (select count(*) from t)                                              as agendados,
  (select count(*) from t where estatus='terminado')                    as terminados,
  (select count(*) from t where nivel='1')                              as nivel_1,
  (select count(*) from t where nivel='2')                              as nivel_2,
  (select count(*) from t where nivel='3')                              as nivel_3,
  coalesce((select sum(minutos_totales) from t where estatus='terminado'),0)/60.0
                                                                        as horas_invertidas,
  coalesce((select sum(tiempo_diseno_min) from t where estatus='terminado'),0)
                                                                        as min_diseno,
  -- min_aplicacion no está en la spec; se agrega para poder mostrar
  -- "% del tiempo que es diseño no facturado" (fila 31 del TABLERO del Excel)
  -- sin recalcular tiempos en el cliente.
  coalesce((select sum(tiempo_aplicacion_min) from t where estatus='terminado'),0)
                                                                        as min_aplicacion,
  (select count(*) from contenido)                                      as videos_publicados,
  coalesce((select sum(vistas_4h) from contenido),0)                    as vistas_totales,
  (select count(*) from v_contenido_filtro where pasa_filtro)           as videos_aptos;


-- ── 8. Seguridad (RLS) ────────────────────────────────────────────────

alter table profiles  enable row level security;
alter table catalogo  enable row level security;
alter table leads     enable row level security;
alter table trabajos  enable row level security;
alter table contenido enable row level security;
alter table ads       enable row level security;
alter table config    enable row level security;

create or replace function mi_rol() returns user_role
language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid()
$$;

-- Los 3 leen todo (equipo de 3 personas, sin secretos entre ellos)
create policy "lectura autenticada" on catalogo  for select to authenticated using (true);
create policy "lectura autenticada" on leads     for select to authenticated using (true);
create policy "lectura autenticada" on trabajos  for select to authenticated using (true);
create policy "lectura autenticada" on contenido for select to authenticated using (true);
create policy "lectura autenticada" on ads       for select to authenticated using (true);
create policy "lectura autenticada" on config    for select to authenticated using (true);
create policy "perfil propio"       on profiles  for select to authenticated using (true);

-- Escritura por rol
create policy "escribe catalogo" on catalogo for all to authenticated
  using (mi_rol() in ('admin','tatuador')) with check (mi_rol() in ('admin','tatuador'));

create policy "escribe leads" on leads for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

create policy "escribe trabajos" on trabajos for all to authenticated
  using (mi_rol() in ('admin','tatuador')) with check (mi_rol() in ('admin','tatuador'));

create policy "escribe contenido" on contenido for all to authenticated
  using (mi_rol() in ('admin','contenido')) with check (mi_rol() in ('admin','contenido'));

create policy "escribe ads" on ads for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

create policy "escribe config" on config for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');


-- ── 9. Storage: fotos de zona y del catálogo ──────────────────────────

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

create policy "fotos lectura" on storage.objects for select
  to authenticated using (bucket_id = 'fotos');

create policy "fotos escritura" on storage.objects for insert
  to authenticated with check (bucket_id = 'fotos');

create policy "fotos actualizacion" on storage.objects for update
  to authenticated using (bucket_id = 'fotos');


-- ── 10. Realtime ──────────────────────────────────────────────────────
-- Estado compartido entre los 3, sin refrescar ni pisarse.

alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table trabajos;
alter publication supabase_realtime add table contenido;
alter publication supabase_realtime add table ads;
alter publication supabase_realtime add table config;
