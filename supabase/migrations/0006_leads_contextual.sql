-- ═══════════════════════════════════════════════════════════════════════
--  Leads contextuales: el estatus deja de ser una etiqueta y pasa a ser
--  un expediente que se llena por etapas.
--
--  Antes el flujo era: registrar lead → editarlo → "convertir en trabajo"
--  reescribiendo a mano lo que ya se había tecleado. El paso de conversión
--  además no arrastraba nada. Aquí se corrige de raíz:
--
--   1. Cada etapa gana sus campos, con constraints que impiden declarar
--      una etapa sin la información que la sostiene. Saltar de "nuevo" a
--      "agendado" sin cotización lo rechaza la base, no la pantalla.
--   2. Al quedar agendado, el trabajo se crea SOLO, sembrado con todo.
--      Con trigger y no en el cliente para que no pueda existir un lead
--      agendado sin su expediente: es justo el bug que se reportó.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Los datos de cada etapa ────────────────────────────────────────

alter table leads
  -- Cotización
  add column monto_cotizado numeric(10,2) check (monto_cotizado > 0),
  add column zona text,
  add column catalogo_id text references catalogo(id),
  add column cotizado_en date,
  -- Agenda
  add column fecha_trazado date,
  add column fecha_tatuaje date,
  add column hora time,
  add column anticipo numeric(10,2) not null default 0 check (anticipo >= 0),
  -- Cierre
  add column motivo_perdida text;

alter table leads add constraint lead_anticipo_no_excede check (
  monto_cotizado is null or anticipo <= monto_cotizado
);

/*
 * Las dos reglas que hacen posible el wizard.
 *
 * No son validación de formulario duplicada: son la razón por la que el
 * asistente puede saltar de "nuevo" a "agendado" y darse cuenta solo de
 * que le falta la cotización. Si vivieran únicamente en React, cualquier
 * edición por otro camino dejaría leads agendados sin precio.
 */
alter table leads add constraint lead_cotizado_requiere_monto check (
  estatus not in ('cotizado', 'agendado') or monto_cotizado is not null
);

alter table leads add constraint lead_agendado_requiere_cita check (
  estatus <> 'agendado' or (fecha_tatuaje is not null and anticipo > 0)
);

create index leads_fecha_tatuaje_idx on leads (fecha_tatuaje)
  where estatus = 'agendado';


-- ── 2. Historial de reprogramaciones ──────────────────────────────────
-- Quién reagenda seguido es quien se va a caer. Sin historial eso no se ve.

create table reprogramaciones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  trabajo_id text references trabajos(id) on delete cascade,
  fecha_anterior date,
  hora_anterior time,
  fecha_nueva date not null,
  hora_nueva time,
  motivo text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),

  -- Cuelga de un lead o de un trabajo, pero de algo tiene que colgar.
  constraint reprogramacion_tiene_dueno check (
    lead_id is not null or trabajo_id is not null
  )
);

create index reprogramaciones_lead_idx on reprogramaciones (lead_id);
create index reprogramaciones_trabajo_idx on reprogramaciones (trabajo_id);

alter table reprogramaciones enable row level security;

create policy "lectura autenticada" on reprogramaciones for select
  to authenticated using (true);

-- Quien puede mover la cita, puede registrar por qué la movió.
create policy "escribe reprogramaciones" on reprogramaciones for all
  to authenticated
  using (mi_rol() in ('admin', 'tatuador'))
  with check (mi_rol() in ('admin', 'tatuador'));


-- ── 3. El lead agendado se materializa en trabajo ─────────────────────

create or replace function siguiente_folio_trabajo() returns text
language sql stable set search_path = public as $$
  select 'T-' || lpad(
    (coalesce(max(nullif(regexp_replace(id, '\D', '', 'g'), ''))::int, 0) + 1)::text,
    3, '0')
  from trabajos
$$;

/*
 * SECURITY INVOKER a propósito (el default de plpgsql): el trigger inserta
 * con los permisos de quien mueve el lead, así que RLS sigue aplicando.
 * Ponerlo DEFINER dejaría que cualquiera con acceso a leads creara
 * trabajos saltándose su rol.
 */
create or replace function crear_trabajo_de_lead() returns trigger
language plpgsql set search_path = public as $$
declare
  v_folio text;
begin
  if new.estatus = 'agendado'
     and not exists (select 1 from trabajos where lead_id = new.id) then

    v_folio := siguiente_folio_trabajo();

    insert into trabajos (
      id, lead_id, cliente, whatsapp, diseno, catalogo_id, nivel, zona,
      fecha_trazado, fecha_tatuaje, hora, precio_total, anticipo, estatus, origen
    ) values (
      v_folio,
      new.id,
      new.nombre,
      new.whatsapp,
      coalesce(nullif(trim(new.que_pidio), ''), 'Por definir'),
      new.catalogo_id,
      coalesce(new.nivel_estimado, '1'),
      coalesce(nullif(trim(new.zona), ''), 'Por definir'),
      new.fecha_trazado,
      new.fecha_tatuaje,
      new.hora,
      new.monto_cotizado,
      new.anticipo,
      -- Si hay cita de trazado, esa es la que viene primero.
      case when new.fecha_trazado is not null then 'trazado_agendado'::trabajo_estatus
           else 'agendado'::trabajo_estatus end,
      new.origen
    );
  end if;

  return new;
end $$;

create trigger leads_agendado_crea_trabajo
  after update of estatus on leads
  for each row execute function crear_trabajo_de_lead();


-- ── 4. Storage: faltaba poder reemplazar una imagen ───────────────────
-- Sin DELETE, cada cambio de foto dejaba el archivo viejo colgado para
-- siempre y el bucket crecía sin que nadie lo notara.

create policy "fotos borrado" on storage.objects for delete
  to authenticated using (bucket_id = 'fotos');
