-- ═══════════════════════════════════════════════════════════════════════
--  Los estados del lead se reducen a los que de verdad son etapas de venta
--
--  `trazado_agendado` y `anticipo_pagado` no eran etapas del embudo:
--    · el trazado es una cita del TRABAJO, no del lead;
--    · el anticipo es un DATO de la cita, no un escalón previo a agendar.
--
--  Tenerlos como estatus obligaba a pasar por escalones intermedios que no
--  cambiaban nada, que es parte del retrabajo que se reportó.
--
--  Va en su propia migración a propósito: cambiar el tipo y en la misma
--  transacción crear constraints que comparan contra él falla — el parser
--  resuelve los literales contra la definición vieja todavía en caché.
-- ═══════════════════════════════════════════════════════════════════════

create type lead_estatus_v2 as enum ('nuevo', 'cotizado', 'agendado', 'perdido');

/*
 * El índice de seguimientos filtra por estatus, así que su expresión quedó
 * compilada contra el tipo viejo. Mientras exista, cambiar el tipo de la
 * columna falla con un "operator does not exist" que no menciona el índice
 * por ningún lado. Se tira aquí y se reconstruye al final.
 */
drop index leads_seguimiento_idx;

alter table leads alter column estatus drop default;

alter table leads
  alter column estatus type lead_estatus_v2
  using (
    case estatus::text
      -- Tenía cita de trazado: eso significa que ya había un precio hablado.
      when 'trazado_agendado' then 'cotizado'
      -- Ya había pagado: en el modelo nuevo eso es estar agendado.
      when 'anticipo_pagado'  then 'agendado'
      else estatus::text
    end
  )::lead_estatus_v2;

alter table leads alter column estatus set default 'nuevo';

drop type lead_estatus;
alter type lead_estatus_v2 rename to lead_estatus;

-- Mismo índice de antes, ya compilado contra el tipo nuevo.
create index leads_seguimiento_idx on leads (fecha_seguimiento)
  where estatus not in ('agendado', 'perdido');
