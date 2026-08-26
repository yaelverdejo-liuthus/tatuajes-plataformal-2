-- ═══════════════════════════════════════════════════════════════════════
--  Un lead que nace agendado también merece su trabajo
--
--  El trigger de 0006 escucha UPDATE OF estatus, que cubre el recorrido
--  normal del embudo. Pero el alta permite registrar a alguien que llega
--  ya cerrado — "ya vino, ya cotizamos, ya pagó anticipo" — y en ese caso
--  el INSERT nunca disparaba nada: quedaba un lead agendado sin expediente,
--  exactamente el hueco que se estaba corrigiendo.
--
--  Se reusa la misma función: ya valida `estatus = 'agendado'` y que no
--  exista un trabajo para ese lead, así que sirve igual en ambos caminos.
-- ═══════════════════════════════════════════════════════════════════════

create trigger leads_alta_agendada_crea_trabajo
  after insert on leads
  for each row execute function crear_trabajo_de_lead();
