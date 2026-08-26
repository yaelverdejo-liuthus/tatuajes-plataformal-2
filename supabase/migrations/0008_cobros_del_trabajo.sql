-- ═══════════════════════════════════════════════════════════════════════
--  Poder cobrar el resto, no solo el anticipo
--
--  `saldo` se calculaba como precio_total - anticipo, así que la única
--  forma de dejar un trabajo en cero era inflar el anticipo hasta el precio
--  completo. Eso miente sobre lo que de verdad se cobró por adelantado, que
--  es justo el número que sostiene la regla de "sin anticipo no hay cita".
--
--  Se separa en dos conceptos:
--    · anticipo — lo que dejó para reservar. Sigue mandando en la regla.
--    · abonos   — todo lo cobrado después, incluido el pago final.
--
--  Un trabajo está pagado cuando saldo llega a cero, sin tocar el anticipo.
-- ═══════════════════════════════════════════════════════════════════════

alter table trabajos
  add column abonos numeric(10,2) not null default 0 check (abonos >= 0);

/*
 * v_dashboard hace `select * from trabajos`, así que arrastra `saldo` y
 * bloquea el DROP. Se tira la vista y se reconstruye idéntica al final —
 * no cambia ni una columna suya, solo hay que quitarla de en medio.
 */
drop view v_dashboard;

-- Las columnas generadas no se pueden redefinir en sitio: se tira y se
-- vuelve a crear. Es seguro porque el valor sale siempre de las otras tres.
alter table trabajos drop column saldo;

alter table trabajos
  add column saldo numeric(10,2)
    generated always as (precio_total - anticipo - abonos) stored;

-- Nadie puede cobrar más de lo que vale la pieza.
alter table trabajos add constraint cobrado_no_excede_precio check (
  anticipo + abonos <= precio_total
);


-- ── La vista, tal como estaba en 0004 ─────────────────────────────────

create view v_dashboard
with (security_invoker = on) as
with t as (select * from trabajos where estatus <> 'cancelado')
select
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
  coalesce((select sum(tiempo_aplicacion_min) from t where estatus='terminado'),0)
                                                                        as min_aplicacion,
  (select count(*) from contenido)                                      as videos_publicados,
  coalesce((select sum(vistas_4h) from contenido),0)                    as vistas_totales,
  (select count(*) from v_contenido_filtro where pasa_filtro)           as videos_aptos,
  coalesce((select sum(gasto_promocion) from contenido),0)              as gasto_promocion_contenido;
