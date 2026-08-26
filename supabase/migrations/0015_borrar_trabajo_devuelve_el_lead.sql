-- ═══════════════════════════════════════════════════════════════════════
--  Borrar un expediente devuelve su lead a "cotizado"
--
--  ── El hueco ─────────────────────────────────────────────────────────
--
--  La plataforma garantiza que un lead en 'agendado' tiene expediente. De
--  eso se encargan los dos triggers de entrada (0006 y 0007): al pasar a
--  agendado, o al nacer agendado, se crea el trabajo.
--
--  Pero nadie vigilaba la SALIDA. Borrar el trabajo desde su ficha dejaba
--  el lead diciendo AGENDADO, con su fecha y su hora, y sin expediente
--  detrás. Nada fallaba y nada avisaba.
--
--  Se notaba porque dos pantallas empezaban a contradecirse: en Leads la
--  tarjeta seguía marcada AGENDADO, mientras que el embudo del Tablero
--  dejaba de contarlo — "agendados" en `v_dashboard` cuenta TRABAJOS, no
--  leads. Un mismo hecho, dos respuestas.
--
--  ── Por qué a 'cotizado' y no a otra cosa ────────────────────────────
--
--  Es el único estado que describe con honestidad lo que queda: a esa
--  persona se le pasó un precio y no tiene sesión agendada. Cumple el
--  constraint `lead_cotizado_requiere_monto` sin esfuerzo, porque un lead
--  que llegó a 'agendado' ya tenía `monto_cotizado` a fuerza.
--
--  NO se baja a 'perdido'. Borrar un expediente puede ser un arrepentimiento
--  ("lo creé mal, lo rehago") o una cancelación de verdad, y desde la base
--  no hay forma de distinguirlos. Darlo por perdido sería inventarse un
--  desenlace; dejarlo en cotizado deja la decisión donde debe estar, que es
--  en quien conoce la conversación.
--
--  ── Qué se conserva y qué se borra ───────────────────────────────────
--
--  La CITA se va: fecha de trazado, fecha de tatuaje y hora. Si no hay
--  expediente, no hay sesión, y dejar la fecha ahí es lo que haría que la
--  tarjeta siguiera diciendo "En 4 días" de algo que ya no existe.
--
--  El ANTICIPO se queda. Que hayan pagado es un hecho, y borrar un
--  expediente en la app no le devuelve el dinero a nadie. Si además hubo
--  devolución, eso se corrige a mano — pero que el sistema olvide solo un
--  cobro es mucho peor que dejarlo a la vista.
--
--  ── Ida y vuelta limpia ──────────────────────────────────────────────
--
--  Como el lead conserva monto y anticipo, volver a ponerlo en 'agendado'
--  dispara `crear_trabajo_de_lead` y le nace un expediente nuevo. Borrar y
--  rehacer vuelve a ser una operación reversible en dos pasos, en vez de
--  un callejón sin salida.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function lead_vuelve_a_cotizado() returns trigger
language plpgsql set search_path = public as $$
begin
  /*
   * `old.lead_id is not null` porque un trabajo puede existir sin lead: los
   * que se dan de alta directo desde Trabajos no vienen de ninguna
   * conversación registrada, y ahí no hay nada que devolver.
   *
   * `estatus = 'agendado'` para no pisar un lead que ya se movió por su
   * cuenta. Si alguien lo marcó 'perdido' y después borró el expediente,
   * ese 'perdido' es información que alguien escribió a propósito y esta
   * regla no tiene por qué opinar.
   */
  if old.lead_id is not null then
    update leads
       set estatus = 'cotizado',
           fecha_trazado = null,
           fecha_tatuaje = null,
           hora = null
     where id = old.lead_id
       and estatus = 'agendado';
  end if;

  return old;
end $$;

/*
 * AFTER DELETE y no BEFORE: si el borrado se cae por una llave foránea
 * —un video de Contenido apuntando a este trabajo lo impide— no queremos
 * haber tocado ya el lead. En AFTER, si el DELETE no llega a completarse,
 * este UPDATE se va con él en el mismo rollback.
 *
 * OJO: TRUNCATE no dispara triggers de fila, así que "Vaciar datos de la
 * plataforma" (que usa truncate) no se ve afectado. Y está bien: ahí se
 * borran leads y trabajos a la vez, no hay nadie a quien devolver nada.
 */
drop trigger if exists trabajos_borrado_devuelve_el_lead on trabajos;

create trigger trabajos_borrado_devuelve_el_lead
  after delete on trabajos
  for each row execute function lead_vuelve_a_cotizado();


-- ── Reparar lo que ya quedó huérfano ──────────────────────────────────
--
-- Los leads que se quedaron en 'agendado' sin expediente antes de que
-- existiera el trigger. Sin esto, la regla nueva solo protege de aquí en
-- adelante y los inconsistentes de ayer siguen ahí para siempre.

update leads l
   set estatus = 'cotizado',
       fecha_trazado = null,
       fecha_tatuaje = null,
       hora = null
 where l.estatus = 'agendado'
   and not exists (select 1 from trabajos t where t.lead_id = l.id);
