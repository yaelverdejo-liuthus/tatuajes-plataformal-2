-- ═══════════════════════════════════════════════════════════════════════
--  Pauta en tres niveles: campaña → creativo → registro diario
--
--  `ads` mezclaba las tres cosas en una fila. Consecuencias:
--    · el presupuesto del creativo se repetía en cada día capturado, así
--      que "el presupuesto" dependía de qué fila mirabas;
--    · no existía la campaña, y sin ella no hay presupuesto total contra
--      el cual comparar lo repartido entre creativos;
--    · el desglose por activo había que armarlo agrupando por un texto
--      escrito a mano, que basta un espacio de más para partir en dos.
--
--  Ahora cada cosa vive donde le toca y `ads` queda como lo que siempre
--  fue de verdad: la captura diaria de gasto y conversaciones.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Plataformas de pauta ───────────────────────────────────────────
/*
 * Enum propio y no el de contenido. Son dominios distintos: el contenido
 * se publica en TikTok, Instagram o Facebook como cuentas separadas, pero
 * la pauta se compra en Meta (que cubre IG y FB juntos) o en TikTok. Meter
 * los dos casos en el mismo tipo obligaba a fingir que "instagram" es un
 * lugar donde se paga, y ahí es donde nace el desorden.
 */
create type plataforma_ads as enum ('meta', 'tiktok');


-- ── 2. Campañas y creativos ───────────────────────────────────────────

create table campanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  plataforma plataforma_ads not null,
  objetivo text not null default 'Mensajes a WhatsApp',
  presupuesto_total numeric(10,2) not null default 0 check (presupuesto_total >= 0),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  activa boolean not null default true,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint campana_fechas_coherentes check (
    fecha_fin is null or fecha_fin >= fecha_inicio
  )
);

create trigger campanas_touch before update on campanas
  for each row execute function touch_updated_at();

create table creativos (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references campanas(id) on delete cascade,
  nombre text not null,
  presupuesto numeric(10,2) not null default 0 check (presupuesto >= 0),
  activo boolean not null default true,
  created_at timestamptz default now()
);

create index creativos_campana_idx on creativos (campana_id);


-- ── 3. `ads` se queda solo con la captura diaria ──────────────────────

drop view v_ads_veredicto;

alter table ads
  add column creativo_id uuid references creativos(id) on delete cascade;

-- Lo que subió de nivel: plataforma y objetivo son de la campaña, el
-- presupuesto es del creativo, y el nombre del creativo ya es una fila.
alter table ads
  drop column plataforma,
  drop column creativo,
  drop column objetivo,
  drop column presupuesto;

create index ads_creativo_idx on ads (creativo_id);


-- ── 4. RLS: misma regla que el resto de la pauta (solo admin) ─────────

alter table campanas  enable row level security;
alter table creativos enable row level security;

create policy "lectura autenticada" on campanas  for select to authenticated using (true);
create policy "lectura autenticada" on creativos for select to authenticated using (true);

create policy "escribe campanas" on campanas for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

create policy "escribe creativos" on creativos for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');


-- ── 5. Vistas con el veredicto, en los tres niveles ───────────────────
-- El veredicto se calcula en Postgres contra los umbrales de `config`,
-- igual que el filtro de contenido: si se calculara en React, en un mes
-- estaría desincronizado con el que muestra el tablero.

create or replace function veredicto_cpc(costo numeric, conversaciones int)
returns text language sql stable set search_path = public as $$
  select case
    when conversaciones = 0 or costo is null then 'sin_datos'
    when costo <= (select valor from config where clave='umbral_cpc_bueno') then 'escalar'
    when costo >= (select valor from config where clave='umbral_cpc_malo')  then 'matar'
    else 'observar'
  end
$$;

/* Registro diario, con el contexto de su creativo y su campaña. */
create view v_ads_veredicto with (security_invoker = on) as
select
  a.id, a.fecha, a.gasto_real, a.conversaciones, a.created_at, a.creativo_id,
  cr.nombre        as creativo,
  cr.presupuesto   as presupuesto,
  ca.id            as campana_id,
  ca.nombre        as campana,
  ca.plataforma    as plataforma,
  ca.objetivo      as objetivo,
  case when a.conversaciones = 0 then null
       else a.gasto_real / a.conversaciones end as costo_por_conversacion,
  veredicto_cpc(
    case when a.conversaciones = 0 then null else a.gasto_real / a.conversaciones end,
    a.conversaciones
  ) as veredicto
from ads a
join creativos cr on cr.id = a.creativo_id
join campanas  ca on ca.id = cr.campana_id;

/* Un creativo con todo lo suyo sumado: es el desglose por activo. */
create view v_creativos with (security_invoker = on) as
select
  cr.id, cr.campana_id, cr.nombre, cr.presupuesto, cr.activo, cr.created_at,
  ca.nombre     as campana,
  ca.plataforma as plataforma,
  coalesce(sum(a.gasto_real), 0)    as gasto_real,
  coalesce(sum(a.conversaciones), 0)::int as conversaciones,
  count(a.id)::int                  as dias_capturados,
  case when coalesce(sum(a.conversaciones), 0) = 0 then null
       else sum(a.gasto_real) / sum(a.conversaciones) end as costo_por_conversacion,
  veredicto_cpc(
    case when coalesce(sum(a.conversaciones), 0) = 0 then null
         else sum(a.gasto_real) / sum(a.conversaciones) end,
    coalesce(sum(a.conversaciones), 0)::int
  ) as veredicto
from creativos cr
join campanas ca on ca.id = cr.campana_id
left join ads a on a.creativo_id = cr.id
group by cr.id, ca.nombre, ca.plataforma;

/* La campaña completa, con lo repartido vs. lo autorizado. */
create view v_campanas with (security_invoker = on) as
select
  ca.id, ca.nombre, ca.plataforma, ca.objetivo, ca.presupuesto_total,
  ca.fecha_inicio, ca.fecha_fin, ca.activa, ca.notas, ca.created_at, ca.updated_at,
  coalesce((select sum(presupuesto) from creativos where campana_id = ca.id), 0)
                                    as presupuesto_asignado,
  (select count(*) from creativos where campana_id = ca.id)::int as num_creativos,
  coalesce(sum(a.gasto_real), 0)    as gasto_real,
  coalesce(sum(a.conversaciones), 0)::int as conversaciones,
  case when coalesce(sum(a.conversaciones), 0) = 0 then null
       else sum(a.gasto_real) / sum(a.conversaciones) end as costo_por_conversacion,
  veredicto_cpc(
    case when coalesce(sum(a.conversaciones), 0) = 0 then null
         else sum(a.gasto_real) / sum(a.conversaciones) end,
    coalesce(sum(a.conversaciones), 0)::int
  ) as veredicto
from campanas ca
left join creativos cr on cr.campana_id = ca.id
left join ads a on a.creativo_id = cr.id
group by ca.id;
